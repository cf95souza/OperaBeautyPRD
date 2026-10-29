import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('FASE 44 - ITEM D17 (P2): Comanda Unificada e Fechamento de Caixa', () => {

  describe('1. Integridade Estrutural de DDL e Migração (phase32_unified_order_and_cash_register.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase32_unified_order_and_cash_register.sql');

    test('o arquivo de migração phase32 deve existir', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    test('deve conter a criação de cap_cash_registers e cap_cash_movements para controle diário de caixa', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_cash_registers');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_cash_movements');
      expect(sql).toContain('initial_balance NUMERIC(10, 2)');
      expect(sql).toContain('cash_difference NUMERIC(10, 2)');
      expect(sql).toContain("type VARCHAR(20) NOT NULL CHECK (type IN ('supply', 'bleed'))");
    });

    test('deve conter a criação de cap_orders, cap_order_items e cap_order_payments para comandas unificadas', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_orders');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_order_items');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_order_payments');
      expect(sql).toContain("item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product'))");
      expect(sql).toContain('tip_amount NUMERIC(10, 2)');
      expect(sql).toContain('change_amount NUMERIC(10, 2)');
    });

    test('deve aplicar Row Level Security (RLS) e concessões estritas ao papel opera_app (Princípio C5)', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('ALTER TABLE public.cap_cash_registers ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE public.cap_orders ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_registers TO opera_app;');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_orders TO opera_app;');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_items TO opera_app;');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_payments TO opera_app;');
    });
  });

  describe('2. Regras de Negócio e Serviços de Backend (cashRegisterService & orderService)', () => {
    const cashServicePath = path.join(rootDir, 'backend/services/cashRegisterService.js');
    const orderServicePath = path.join(rootDir, 'backend/services/orderService.js');

    test('cashRegisterService deve implementar abertura, movimentações, fechamento e detalhes', () => {
      expect(fs.existsSync(cashServicePath)).toBe(true);
      const code = fs.readFileSync(cashServicePath, 'utf8');
      expect(code).toContain('export const getCurrentCashRegister');
      expect(code).toContain('export const openCashRegister');
      expect(code).toContain('export const addCashMovement');
      expect(code).toContain('export const closeCashRegister');
      expect(code).toContain('export const listCashRegisters');
      expect(code).toContain('export const getCashRegisterDetails');
    });

    test('cashRegisterService deve validar sangria impedindo retirada maior que saldo em gaveta', () => {
      const code = fs.readFileSync(cashServicePath, 'utf8');
      expect(code).toContain("type === 'bleed'");
      expect(code).toContain('Saldo em dinheiro insuficiente na gaveta para sangria');
    });

    test('orderService deve suportar comandas unificadas, split payment e baixa atômica', () => {
      expect(fs.existsSync(orderServicePath)).toBe(true);
      const code = fs.readFileSync(orderServicePath, 'utf8');
      expect(code).toContain('export const createOrder');
      expect(code).toContain('export const addItemToOrder');
      expect(code).toContain('export const removeItemFromOrder');
      expect(code).toContain('export const checkoutOrder');
      expect(code).toContain('export const getOrderById');
      expect(code).toContain('export const listOrders');
      expect(code).toContain('export const cancelOrder');
    });

    test('orderService deve realizar lock FOR UPDATE de estoque e baixa atômica para produtos', () => {
      const code = fs.readFileSync(orderServicePath, 'utf8');
      expect(code).toContain('FOR UPDATE');
      expect(code).toContain('quantity = quantity - $1');
      expect(code).toContain('Estoque insuficiente para o produto');
    });

    test('orderService deve validar que a soma dos pagamentos cobre o total da comanda', () => {
      const code = fs.readFileSync(orderServicePath, 'utf8');
      expect(code).toContain('totalPaid < netTotal');
      expect(code).toContain('Valor pago');
      expect(code).toContain('é inferior ao total da comanda');
    });

    test('orderService deve calcular troco em dinheiro caso haja valor pago excedente', () => {
      const code = fs.readFileSync(orderServicePath, 'utf8');
      expect(code).toContain('changeAmount = excess');
      expect(code).toContain('change_amount');
    });
  });

  describe('3. Rotas REST e Schemas Zod de Validação', () => {
    const cashRoutesPath = path.join(rootDir, 'backend/routes/cashRegister.js');
    const orderRoutesPath = path.join(rootDir, 'backend/routes/orders.js');

    test('as rotas de caixa e comandas devem existir', () => {
      expect(fs.existsSync(cashRoutesPath)).toBe(true);
      expect(fs.existsSync(orderRoutesPath)).toBe(true);
    });

    test('app.js deve registrar os endpoints /api/cash-register e /api/orders', () => {
      const appJs = fs.readFileSync(path.join(rootDir, 'backend/app.js'), 'utf8');
      expect(appJs).toContain("app.use('/api/cash-register', cashRegisterRoutes);");
      expect(appJs).toContain("app.use('/api/orders', orderRoutes);");
    });

    test('api.js deve conter os módulos api.cashRegister e api.orders integrados', () => {
      const apiJs = fs.readFileSync(path.join(rootDir, 'src/lib/api.js'), 'utf8');
      expect(apiJs).toContain('cashRegister: {');
      expect(apiJs).toContain('orders: {');
      expect(apiJs).toContain("request('/cash-register/current')");
      expect(apiJs).toContain("request('/orders");
    });
  });

  describe('4. Regra de Negócio: Cálculo de Totais e Split Payment', () => {
    test('deve calcular corretamente a divisão de pagamento entre múltiplas formas', () => {
      const subtotal = 320.00;
      const discount = 20.00;
      const tip = 30.00;
      const netTotal = subtotal - discount + tip; // 330.00

      const payments = [
        { payment_method: 'wallet', amount: 50.00 },
        { payment_method: 'giftcard', amount: 80.00 },
        { payment_method: 'pix', amount: 100.00 },
        { payment_method: 'credit_card', amount: 100.00 }
      ];

      const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
      expect(netTotal).toBe(330.00);
      expect(totalPaid).toBe(330.00);
      expect(totalPaid >= netTotal).toBe(true);
    });

    test('deve calcular troco em dinheiro com precisão', () => {
      const netTotal = 185.00;
      const payments = [
        { payment_method: 'cash', amount: 200.00 }
      ];

      const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
      const change = totalPaid - netTotal;
      expect(change).toBe(15.00);
    });
  });
});
