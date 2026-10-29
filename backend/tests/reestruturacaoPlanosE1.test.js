import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fase 45: E1 (P1) — Reestruturação de Planos e Preços', () => {
  const migrationPath = path.resolve(__dirname, '../migrations/phase35_restructure_plans_e1.sql');
  const planServicePath = path.resolve(__dirname, '../services/planService.js');
  const tenantServicePath = path.resolve(__dirname, '../services/tenantService.js');
  const saasBillingServicePath = path.resolve(__dirname, '../services/saasBillingService.js');
  const featureFlagMiddlewarePath = path.resolve(__dirname, '../middlewares/featureFlagMiddleware.js');
  const assinaturaSaaSPath = path.resolve(__dirname, '../../src/pages/admin/AssinaturaSaaS.jsx');
  const upgradePlanPath = path.resolve(__dirname, '../../src/pages/admin/UpgradePlanRequired.jsx');
  const adminLayoutPath = path.resolve(__dirname, '../../src/components/admin/AdminLayout.jsx');

  describe('1. Integridade de DDL, Migração e Governança C5', () => {
    it('deve existir o arquivo de migração phase35_restructure_plans_e1.sql com colunas estruturais', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // cap_plans
      expect(sql).toContain('slug VARCHAR(50) UNIQUE');
      expect(sql).toContain('max_whatsapp_messages INT DEFAULT 0');
      expect(sql).toContain('is_featured BOOLEAN DEFAULT FALSE');
      expect(sql).toContain('badge_label VARCHAR(50)');
      expect(sql).toContain('marketing_features JSONB');
      expect(sql).toContain('extra_professional_price NUMERIC(10,2)');

      // cap_tenants
      expect(sql).toContain('is_founder BOOLEAN NOT NULL DEFAULT FALSE');
      expect(sql).toContain('frozen_price NUMERIC(10,2)');
      expect(sql).toContain('price_frozen_until TIMESTAMPTZ');
      expect(sql).toContain('founder_badge_label VARCHAR(50)');

      // Princípio C5
      expect(sql).toContain('GRANT SELECT, UPDATE ON public.cap_plans TO opera_app;');
      expect(sql).toContain('GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;');
    });

    it('deve definir os 4 planos oficiais (Solo, Essencial, Premium, Signature) na migração', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');

      expect(sql).toContain("'Solo'");
      expect(sql).toContain("'solo'");
      expect(sql).toContain('49.90');

      expect(sql).toContain("'Essencial'");
      expect(sql).toContain("'essencial'");
      expect(sql).toContain('79.90');

      expect(sql).toContain("'Premium'");
      expect(sql).toContain("'premium'");
      expect(sql).toContain('129.90');
      expect(sql).toContain("'Mais Escolhido'");

      expect(sql).toContain("'Signature'");
      expect(sql).toContain("'signature'");
      expect(sql).toContain('199.90');
    });

    it('deve aplicar preço congelado de 12 meses e selo Fundador para inquilinos existentes', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('is_founder = TRUE');
      expect(sql).toContain('frozen_price = 99.90');
      expect(sql).toContain("NOW() + INTERVAL '12 months'");
      expect(sql).toContain("founder_badge_label = 'Fundador'");
    });
  });

  describe('2. Backend Services e Regras de Negócio', () => {
    it('planService.js deve consultar os novos atributos e ordenar por sort_order', () => {
      const content = fs.readFileSync(planServicePath, 'utf8');
      expect(content).toContain('p.slug');
      expect(content).toContain('p.marketing_features');
      expect(content).toContain('p.is_featured');
      expect(content).toContain('p.max_whatsapp_messages');
      expect(content).toContain('ORDER BY COALESCE(p.sort_order, 0) ASC');
    });

    it('tenantService.js deve expor campos de fundador e plano', () => {
      const content = fs.readFileSync(tenantServicePath, 'utf8');
      expect(content).toContain('t.is_founder');
      expect(content).toContain('t.frozen_price');
      expect(content).toContain('t.price_frozen_until');
      expect(content).toContain('t.founder_badge_label');
      expect(content).toContain('p.name as plan_name');
      expect(content).toContain('p.slug as plan_slug');
    });

    it('saasBillingService.js deve respeitar o preço congelado para inquilinos fundadores', () => {
      const content = fs.readFileSync(saasBillingServicePath, 'utf8');
      expect(content).toContain('is_founder');
      expect(content).toContain('frozen_price');
      expect(content).toContain('isPriceFrozen');
      expect(content).toContain('effectiveMonthlyPrice');
    });

    it('featureFlagMiddleware.js deve validar recursos por plano e feature flags', () => {
      const content = fs.readFileSync(featureFlagMiddlewarePath, 'utf8');
      expect(content).toContain('requireFeature');
      expect(content).toContain('plan_features');
    });
  });

  describe('3. Frontend Editorial Rosé e Experiência do Gestor', () => {
    it('AssinaturaSaaS.jsx deve exibir o selo de Fundador, preço congelado e catálogo de planos com toggle', () => {
      const content = fs.readFileSync(assinaturaSaaSPath, 'utf8');
      expect(content).toContain('is_founder');
      expect(content).toContain('Preço Congelado');
      expect(content).toContain('Catálogo de Planos OperaBeauty');
      expect(content).toContain('billingCycle');
      expect(content).toContain('2 meses grátis');
      expect(content).toContain('Seu Plano Atual');
      expect(content).toContain('Mais Escolhido');
    });

    it('UpgradePlanRequired.jsx deve listar os 4 planos e direcionar para gestão de assinatura', () => {
      const content = fs.readFileSync(upgradePlanPath, 'utf8');
      expect(content).toContain('Recurso Exclusivo do Plano');
      expect(content).toContain('api.plans.list');
      expect(content).toContain('Gerenciar Minha Assinatura');
    });

    it('AdminLayout.jsx deve renderizar a estrela e selo Fundador no menu lateral', () => {
      const content = fs.readFileSync(adminLayoutPath, 'utf8');
      expect(content).toContain('tenant?.is_founder');
      expect(content).toContain('founder_badge_label');
      expect(content).toContain('★');
    });
  });
});
