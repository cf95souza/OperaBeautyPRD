import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fase 50 / G39: Nova Grade de 3 Planos, Travas Rígidas, Cupons SaaS, SEO e Blindagem de Cobrança', () => {
  const migration50Path = path.resolve(__dirname, '../../migrations/phase50_plans_v2_and_saas_coupons.sql');
  const saasCouponServicePath = path.resolve(__dirname, '../services/saasCouponService.js');
  const saasBillingServicePath = path.resolve(__dirname, '../services/saasBillingService.js');
  const staffServicePath = path.resolve(__dirname, '../services/staffService.js');
  const inventoryRoutePath = path.resolve(__dirname, '../routes/inventory.js');
  const anamnesisRoutePath = path.resolve(__dirname, '../routes/anamnesis.js');
  const cashRegisterRoutePath = path.resolve(__dirname, '../routes/cashRegister.js');
  const minisiteRoutePath = path.resolve(__dirname, '../routes/minisite.js');
  const minisiteServicePath = path.resolve(__dirname, '../services/minisiteService.js');
  const invoicesRoutePath = path.resolve(__dirname, '../routes/invoices.js');
  const superadminRoutePath = path.resolve(__dirname, '../routes/superadmin.js');
  const paginaPlanosPath = path.resolve(__dirname, '../../src/pages/PaginaPlanos.jsx');
  const modalPixPath = path.resolve(__dirname, '../../src/components/admin/ModalPagamentoPixSaaS.jsx');
  const planosAdminPath = path.resolve(__dirname, '../../src/pages/superadmin/PlanosAdmin.jsx');
  const tenantDetailAdminPath = path.resolve(__dirname, '../../src/pages/superadmin/TenantDetailAdmin.jsx');
  const indexHtmlPath = path.resolve(__dirname, '../../index.html');
  const robotsTxtPath = path.resolve(__dirname, '../../public/robots.txt');
  const sitemapXmlPath = path.resolve(__dirname, '../../public/sitemap.xml');

  describe('1. Migração Phase 50 e Estrutura de Banco de Dados', () => {
    it('deve existir o arquivo de migração phase50_plans_v2_and_saas_coupons.sql', () => {
      expect(fs.existsSync(migration50Path)).toBe(true);
      const sql = fs.readFileSync(migration50Path, 'utf8');

      // Tabela de Cupons SaaS
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_saas_coupons');
      expect(sql).toContain('code VARCHAR(50) UNIQUE NOT NULL');
      expect(sql).toContain('discount_type VARCHAR(20)');
      expect(sql).toContain('discount_value NUMERIC(10, 2)');
      expect(sql).toContain('applies_to VARCHAR(30)');
      expect(sql).toContain('plan_slugs JSONB');

      // Colunas de desconto em cap_invoices
      expect(sql).toContain('original_amount NUMERIC(10, 2)');
      expect(sql).toContain('discount_amount NUMERIC(10, 2)');
      expect(sql).toContain('applied_coupon_code VARCHAR(50)');

      // Desativação de Signature
      expect(sql).toContain("is_active = FALSE");
      expect(sql).toContain("'signature'");

      // Plano Básico (R$ 39,90, 2 profissionais, sem minisite/anamnese/estoque)
      expect(sql).toContain("'Básico'");
      expect(sql).toContain('39.90');
      expect(sql).toContain('399.00');
      expect(sql).toContain('max_professionals = 2');

      // Plano Essencial (R$ 59,90, 5 profissionais, com minisite e anamnese)
      expect(sql).toContain("'Essencial'");
      expect(sql).toContain('59.90');
      expect(sql).toContain('599.00');
      expect(sql).toContain('max_professionals = 5');

      // Plano Premium (R$ 79,90, 15 profissionais, completo)
      expect(sql).toContain("'Premium'");
      expect(sql).toContain('79.90');
      expect(sql).toContain('799.00');

      // Cupons sementes ESSENCIAL30 e PREMIUM40
      expect(sql).toContain("'ESSENCIAL30'");
      expect(sql).toContain('30.00');
      expect(sql).toContain("'PREMIUM40'");
      expect(sql).toContain('40.00');
    });
  });

  describe('2. Backend Services e Regras de Negócio de Cupons SaaS', () => {
    it('saasCouponService.js deve exportar validação, aplicação de cupom e desconto manual', () => {
      expect(fs.existsSync(saasCouponServicePath)).toBe(true);
      const content = fs.readFileSync(saasCouponServicePath, 'utf8');

      expect(content).toContain('validateSaaSCoupon');
      expect(content).toContain('applyCouponToInvoice');
      expect(content).toContain('applyManualDiscountToInvoice');
      expect(content).toContain('listSaaSCoupons');
      expect(content).toContain('createSaaSCoupon');
      expect(content).toContain('toggleSaaSCoupon');
      expect(content).toContain('deleteSaaSCoupon');
    });

    it('invoices.js e superadmin.js devem conter rotas para cupons SaaS e descontos', () => {
      const invContent = fs.readFileSync(invoicesRoutePath, 'utf8');
      expect(invContent).toContain("router.post('/:id/verify-payment'");
      expect(invContent).toContain("router.post('/validate-coupon'");
      expect(invContent).toContain("router.post('/:id/apply-coupon'");
      expect(invContent).toContain("router.post('/:id/manual-discount'");
      expect(invContent).toContain("router.post('/test-gateway'");

      const superContent = fs.readFileSync(superadminRoutePath, 'utf8');
      expect(superContent).toContain("router.get('/saas-coupons'");
      expect(superContent).toContain("router.post('/saas-coupons'");
      expect(superContent).toContain("router.patch('/saas-coupons/:id/status'");
      expect(superContent).toContain("router.delete('/saas-coupons/:id'");
    });

    it('saasBillingService.js deve exportar verifySaaSInvoicePayment para consulta proativa no Mercado Pago', () => {
      const content = fs.readFileSync(saasBillingServicePath, 'utf8');
      expect(content).toContain('export const verifySaaSInvoicePayment = async');
      expect(content).toContain('https://api.mercadopago.com/v1/payments/');
    });
  });

  describe('3. Travas de Recursos (Feature Gates) e Limite de Profissionais', () => {
    it('staffService.js deve bloquear a criação de profissionais além de max_professionals do plano', () => {
      const content = fs.readFileSync(staffServicePath, 'utf8');
      expect(content).toContain('p.max_professionals');
      expect(content).toContain('currentStaffCount >= maxProfessionals');
      expect(content).toContain('error.statusCode = 403');
    });

    it('rotas restritas a planos superiores devem exigir requireFeature', () => {
      const invContent = fs.readFileSync(inventoryRoutePath, 'utf8');
      expect(invContent).toContain("requireFeature('estoque')");

      const anamContent = fs.readFileSync(anamnesisRoutePath, 'utf8');
      expect(anamContent).toContain("requireFeature('anamnesis')");

      const cashContent = fs.readFileSync(cashRegisterRoutePath, 'utf8');
      expect(cashContent).toContain("requireFeature('financeiro')");

      const miniContent = fs.readFileSync(minisiteRoutePath, 'utf8');
      expect(miniContent).toContain("requireFeature('minisite')");

      const miniServiceContent = fs.readFileSync(minisiteServicePath, 'utf8');
      expect(miniServiceContent).toContain("planFeatures.includes('minisite')");
    });
  });

  describe('4. SEO e Indexação no Google', () => {
    it('index.html, robots.txt e sitemap.xml não devem conter operabeauty.com.br mas sim operabeauty.tech', () => {
      const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
      expect(indexContent).not.toContain('operabeauty.com.br');
      expect(indexContent).toContain('https://operabeauty.tech/');

      const robotsContent = fs.readFileSync(robotsTxtPath, 'utf8');
      expect(robotsContent).not.toContain('operabeauty.com.br');
      expect(robotsContent).toContain('https://operabeauty.tech/sitemap.xml');

      const sitemapContent = fs.readFileSync(sitemapXmlPath, 'utf8');
      expect(sitemapContent).not.toContain('operabeauty.com.br');
      expect(sitemapContent).toContain('https://operabeauty.tech/');
    });
  });

  describe('5. Frontend (Páginas e Componentes)', () => {
    it('PaginaPlanos.jsx deve exibir grade de 3 colunas e tabela comparativa de 3 colunas', () => {
      const content = fs.readFileSync(paginaPlanosPath, 'utf8');
      expect(content).toContain('lg:grid-cols-3');
      expect(content).toContain('ESSENCIAL30');
      expect(content).toContain('PREMIUM40');
      expect(content).toContain('Custa menos que 1 serviço!');
      expect(content).toContain('basico:');
      expect(content).toContain('essencial:');
      expect(content).toContain('premium:');
      expect(content).not.toContain('signature:');
    });

    it('ModalPagamentoPixSaaS.jsx deve permitir cupom de desconto e verificação manual no gateway', () => {
      const content = fs.readFileSync(modalPixPath, 'utf8');
      expect(content).toContain('handleApplyCoupon');
      expect(content).toContain('handleVerifyPayment');
      expect(content).toContain('Já fiz o PIX, verificar agora');
      expect(content).toContain('Possui cupom promocional?');
    });

    it('PlanosAdmin.jsx e TenantDetailAdmin.jsx devem suportar gestão de cupons SaaS e descontos manuais', () => {
      const planosContent = fs.readFileSync(planosAdminPath, 'utf8');
      expect(planosContent).toContain('Cupons & Campanhas SaaS');
      expect(planosContent).toContain('Diagnóstico Gateway (Mercado Pago)');
      expect(planosContent).toContain('handleCreateCoupon');
      expect(planosContent).toContain('handleTestGateway');

      const tenantDetailContent = fs.readFileSync(tenantDetailAdminPath, 'utf8');
      expect(tenantDetailContent).toContain('handleApplyDiscount');
      expect(tenantDetailContent).toContain('Desconto');
    });
  });
});
