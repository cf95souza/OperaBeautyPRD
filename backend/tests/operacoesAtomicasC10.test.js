import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C10 (P1) — Operações Atômicas, Idempotência e Livro-Razão', () => {
  const migrationPath = path.join(rootDir, 'migrations/phase16_atomic_operations.sql');
  const databaseDocPath = path.join(rootDir, 'database.md');
  const initSqlPath = path.join(rootDir, 'init.sql');
  const couponServicePath = path.join(rootDir, 'backend/services/couponService.js');
  const couponRoutesPath = path.join(rootDir, 'backend/routes/coupons.js');
  const walletServicePath = path.join(rootDir, 'backend/services/walletService.js');
  const giftcardServicePath = path.join(rootDir, 'backend/services/giftcardService.js');
  const giftcardRoutesPath = path.join(rootDir, 'backend/routes/giftcards.js');
  const productSaleServicePath = path.join(rootDir, 'backend/services/productSaleService.js');
  const appointmentServicePath = path.join(rootDir, 'backend/services/appointmentService.js');

  test('Todos os arquivos de governança, migrações, serviços e rotas devem existir', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(databaseDocPath)).toBe(true);
    expect(fs.existsSync(initSqlPath)).toBe(true);
    expect(fs.existsSync(couponServicePath)).toBe(true);
    expect(fs.existsSync(couponRoutesPath)).toBe(true);
    expect(fs.existsSync(walletServicePath)).toBe(true);
    expect(fs.existsSync(giftcardServicePath)).toBe(true);
    expect(fs.existsSync(giftcardRoutesPath)).toBe(true);
    expect(fs.existsSync(productSaleServicePath)).toBe(true);
    expect(fs.existsSync(appointmentServicePath)).toBe(true);
  });

  describe('1. Banco de Dados e Constraints Estruturais (PostgreSQL DDL)', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8');
    const databaseDoc = fs.readFileSync(databaseDocPath, 'utf8');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    test('cap_inventory deve possuir constraint chk_inventory_quantity_non_negative (quantity >= 0)', () => {
      expect(migration).toMatch(/chk_inventory_quantity_non_negative\s+CHECK\s*\(quantity\s*>=\s*0\)/i);
      expect(databaseDoc).toMatch(/chk_inventory_quantity_non_negative\s+CHECK\s*\(quantity\s*>=\s*0\)/i);
      expect(initSql).toMatch(/chk_inventory_quantity_non_negative\s+CHECK\s*\(quantity\s*>=\s*0\)/i);
    });

    test('cap_coupons deve possuir constraints chk_coupon_uses e chk_coupon_current_uses_non_negative', () => {
      expect(migration).toMatch(/chk_coupon_uses\s+CHECK\s*\(max_uses\s+IS\s+NULL\s+OR\s+current_uses\s*<=\s*max_uses\)/i);
      expect(migration).toMatch(/chk_coupon_current_uses_non_negative\s+CHECK\s*\(current_uses\s*>=\s*0\)/i);
      expect(databaseDoc).toMatch(/chk_coupon_uses/);
      expect(initSql).toMatch(/chk_coupon_uses/);
    });

    test('cap_wallet_transactions deve possuir idempotency_key e unique constraint uq_wallet_idempotency', () => {
      expect(migration).toMatch(/uq_wallet_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i);
      expect(databaseDoc).toMatch(/uq_wallet_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i);
      expect(initSql).toMatch(/uq_wallet_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i);
    });

    test('cap_client_wallets deve possuir constraint chk_wallet_balance_non_negative (balance >= 0.00)', () => {
      expect(migration).toMatch(/chk_wallet_balance_non_negative\s+CHECK\s*\(balance\s*>=\s*0\.00\)/i);
      expect(databaseDoc).toMatch(/chk_wallet_balance_non_negative/);
      expect(initSql).toMatch(/balance\s+DECIMAL\(10,\s*2\)\s+NOT\s+NULL\s+DEFAULT\s+0\.00\s+CHECK\s*\(balance\s*>=\s*0\.00\)/i);
    });

    test('cap_giftcards deve possuir constraint chk_giftcard_balance_non_negative e idempotência', () => {
      expect(migration).toMatch(/chk_giftcard_balance_non_negative\s+CHECK\s*\(available_balance\s*>=\s*0\)/i);
      expect(migration).toMatch(/uq_giftcard_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i);
      expect(databaseDoc).toMatch(/chk_giftcard_balance_non_negative/);
      expect(initSql).toMatch(/chk_giftcard_balance_non_negative/);
    });

    test('cap_giftcard_redemptions deve ser livro-razão imutável com uq_giftcard_redemption_idempotency e RLS', () => {
      expect(migration).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.cap_giftcard_redemptions/i);
      expect(migration).toMatch(/uq_giftcard_redemption_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i);
      expect(migration).toMatch(/GRANT\s+SELECT,\s+INSERT,\s+UPDATE,\s+DELETE\s+ON\s+public\.cap_giftcard_redemptions\s+TO\s+opera_app/i);
      expect(migration).toMatch(/ALTER\s+TABLE\s+public\.cap_giftcard_redemptions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(initSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.cap_giftcard_redemptions/i);
    });
  });

  describe('2. Cupons Atômicos em Ponto Único (couponService.js)', () => {
    const couponService = fs.readFileSync(couponServicePath, 'utf8');

    test('redeemCoupon deve executar UPDATE atômico condicional com current_uses < max_uses RETURNING', () => {
      expect(couponService).toMatch(/UPDATE\s+public\.cap_coupons/i);
      expect(couponService).toMatch(/SET\s+current_uses\s*=\s*current_uses\s*\+\s*1/i);
      expect(couponService).toMatch(/\(max_uses\s+IS\s+NULL\s+OR\s+current_uses\s*<\s*max_uses\)/i);
      expect(couponService).toMatch(/RETURNING\s+(id|\*)/i);
    });

    test('redeemCoupon deve tratar erro amigável quando cupom estiver esgotado ou inválido', () => {
      expect(couponService).toMatch(/Este cupom já atingiu o limite máximo de usos/i);
    });
  });

  describe('3. Carteira Digital e Cashback com Idempotência (walletService.js)', () => {
    const walletService = fs.readFileSync(walletServicePath, 'utf8');

    test('processCashbackEarnings deve utilizar chave de idempotência com ON CONFLICT DO NOTHING', () => {
      expect(walletService).toMatch(/cashback:earn:\$\{appointmentId\}/);
      expect(walletService).toMatch(/ON CONFLICT\s*\(tenant_id,\s*idempotency_key\)\s*DO\s*NOTHING/i);
    });

    test('processCashbackRedemption deve checar idempotência e debitar atomicamente com balance >= $1', () => {
      expect(walletService).toMatch(/cashback:redeem:\$\{appointmentId\}/);
      expect(walletService).toMatch(/WHERE\s+tenant_id\s*=\s*\$2\s+AND\s+client_id\s*=\s*\$3\s+AND\s+balance\s*>=\s*\$1/i);
      expect(walletService).toMatch(/Saldo de cashback insuficiente para resgate/i);
    });

    test('processCashbackRefund deve aceitar chave de idempotência com ON CONFLICT DO NOTHING', () => {
      expect(walletService).toMatch(/cashback:refund:\$\{appointmentId\}/);
      expect(walletService).toMatch(/ON CONFLICT\s*\(tenant_id,\s*idempotency_key\)\s*DO\s*NOTHING/i);
    });
  });

  describe('4. Vales-Presente, Livro-Razão e Idempotência (giftcardService.js & routes/giftcards.js)', () => {
    const giftcardService = fs.readFileSync(giftcardServicePath, 'utf8');
    const giftcardRoutes = fs.readFileSync(giftcardRoutesPath, 'utf8');

    test('redeemGiftCard deve suportar chave de idempotência e retornar resgate existente se já processado', () => {
      expect(giftcardService).toMatch(/FROM\s+public\.cap_giftcard_redemptions/i);
      expect(giftcardService).toMatch(/WHERE\s+r\.tenant_id\s*=\s*\$1\s+AND\s+r\.idempotency_key\s*=\s*\$2/i);
      expect(giftcardService).toMatch(/is_idempotent:\s*true/);
    });

    test('redeemGiftCard deve debitar atomicamente com available_balance >= $2 e gravar no livro-razão', () => {
      expect(giftcardService).toMatch(/available_balance\s*=\s*available_balance\s*-\s*\$2/i);
      expect(giftcardService).toMatch(/WHERE\s+id\s*=\s*\$1\s+AND\s+tenant_id\s*=\s*\$3\s+AND\s+available_balance\s*>=\s*\$2/i);
      expect(giftcardService).toMatch(/INSERT\s+INTO\s+public\.cap_giftcard_redemptions/i);
    });

    test('Rotas de gift cards devem aceitar idempotency_key no body ou cabeçalho', () => {
      expect(giftcardRoutes).toMatch(/idempotency_key:\s*z\.string\(\)/);
      expect(giftcardRoutes).toMatch(/req\.body\.idempotency_key\s*\|\|\s*req\.headers\['idempotency-key'\]/);
    });
  });

  describe('5. Baixa Atômica de Estoque e Prevenção de Deadlocks (productSaleService.js & appointmentService.js)', () => {
    const productSaleService = fs.readFileSync(productSaleServicePath, 'utf8');
    const appointmentService = fs.readFileSync(appointmentServicePath, 'utf8');

    test('createProductSale deve ordenar itens por inventory_id para prevenir deadlocks', () => {
      expect(productSaleService).toMatch(/sortedItems\s*=\s*\[\.\.\.items\]\.sort\(/);
      expect(productSaleService).toMatch(/localeCompare/);
    });

    test('createProductSale deve travar linha com FOR UPDATE e baixar atomicamente com quantity >= $1', () => {
      expect(productSaleService).toMatch(/SELECT\s+id,\s+name,\s+quantity,\s+price,\s+type\s+FROM\s+public\.cap_inventory/i);
      expect(productSaleService).toMatch(/FOR UPDATE/i);
      expect(productSaleService).toMatch(/UPDATE\s+public\.cap_inventory/i);
      expect(productSaleService).toMatch(/quantity\s*=\s*quantity\s*-\s*\$1/i);
      expect(productSaleService).toMatch(/quantity\s*>=\s*\$1/i);
      expect(productSaleService).toMatch(/RETURNING\s+id,\s+quantity/i);
    });

    test('createProductSale deve tratar código de erro 23514 de violação de constraint de estoque negativo', () => {
      expect(productSaleService).toMatch(/error\.code\s*===\s*'23514'/);
      expect(productSaleService).toMatch(/a quantidade em estoque não pode ser negativa/i);
    });

    test('appointmentService deve consumir insumos com GREATEST(0.00, quantity - $1)', () => {
      expect(appointmentService).toMatch(/SET\s+quantity\s*=\s*GREATEST\(0\.00,\s*quantity\s*-\s*\$1\)/i);
    });
  });
});
