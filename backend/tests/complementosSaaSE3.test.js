import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

/**
 * Suíte de Testes Automatizados — Item E3 (P2) — Complementos (Add-ons do SaaS)
 * Cobrindo pacotes extras de WhatsApp, Domínio Próprio, Emissão Fiscal NFS-e e Governança
 */

describe('Fase 45 — Item E3: Complementos e Add-ons do SaaS', () => {

  describe('1. Modelagem Relacional & Migração SQL (phase38_saas_addons_e3.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase38_saas_addons_e3.sql');

    it('deve existir o arquivo de migração SQL para os add-ons', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('deve definir a tabela cap_addons com categorias e features jsonb', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_addons');
      expect(sql).toContain('slug VARCHAR(50) UNIQUE NOT NULL');
      expect(sql).toContain('price NUMERIC(10, 2)');
      expect(sql).toContain('category VARCHAR(30)');
      expect(sql).toContain('features JSONB');
    });

    it('deve definir a tabela cap_tenant_addons com unicidade e chave estrangeira', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_tenant_addons');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES public.cap_tenants');
      expect(sql).toContain('addon_id UUID NOT NULL REFERENCES public.cap_addons');
      expect(sql).toContain('CONSTRAINT uq_tenant_addon UNIQUE (tenant_id, addon_id)');
    });

    it('deve estender cap_tenants com campos de domínio, whatsapp extra e nfse', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('custom_domain VARCHAR(255)');
      expect(sql).toContain('custom_domain_verified BOOLEAN DEFAULT FALSE');
      expect(sql).toContain('extra_whatsapp_messages INT DEFAULT 0');
      expect(sql).toContain('nfse_enabled BOOLEAN DEFAULT FALSE');
    });

    it('deve conter o seed dos 4 complementos oficiais', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('whatsapp_500');
      expect(sql).toContain('whatsapp_1000');
      expect(sql).toContain('custom_domain');
      expect(sql).toContain('nfse_module');
    });

    it('deve aplicar RLS multi-tenant e conceder permissões DML restritas ao papel opera_app (C5)', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('ALTER TABLE public.cap_tenant_addons ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('GRANT SELECT ON public.cap_addons TO opera_app;');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenant_addons TO opera_app;');
      expect(sql).toContain('GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;');
    });
  });

  describe('2. Serviço de Backend (addonService.js)', () => {
    const servicePath = path.join(rootDir, 'backend/services/addonService.js');

    it('deve existir o arquivo de serviço addonService.js', () => {
      expect(fs.existsSync(servicePath)).toBe(true);
    });

    it('deve exportar as funções essenciais de gestão de add-ons', () => {
      const content = fs.readFileSync(servicePath, 'utf8');
      expect(content).toContain('export const listAvailableAddons');
      expect(content).toContain('export const getTenantAddons');
      expect(content).toContain('export const subscribeAddon');
      expect(content).toContain('export const cancelAddon');
      expect(content).toContain('export const updateAddonConfig');
      expect(content).toContain('export const verifyCustomDomainDns');
    });

    it('deve atualizar atomicamente as cotas em cap_tenants ao contratar ou cancelar add-on', () => {
      const content = fs.readFileSync(servicePath, 'utf8');
      expect(content).toContain('BEGIN');
      expect(content).toContain('COMMIT');
      expect(content).toContain('ROLLBACK');
      expect(content).toContain('extra_whatsapp_messages');
      expect(content).toContain('custom_domain');
      expect(content).toContain('nfse_enabled');
    });

    it('deve registrar trilha de auditoria via logAudit ao assinar ou cancelar add-on', () => {
      const content = fs.readFileSync(servicePath, 'utf8');
      expect(content).toContain("action: 'SUBSCRIBE_ADDON'");
      expect(content).toContain("action: 'CANCEL_ADDON'");
    });
  });

  describe('3. Rotas REST de Backend (routes/addons.js & app.js)', () => {
    const routesPath = path.join(rootDir, 'backend/routes/addons.js');
    const appPath = path.join(rootDir, 'backend/app.js');

    it('deve existir o arquivo routes/addons.js com schemas Zod e controle de acesso', () => {
      expect(fs.existsSync(routesPath)).toBe(true);
      const content = fs.readFileSync(routesPath, 'utf8');
      expect(content).toContain('router.get(');
      expect(content).toContain("router.post('/subscribe'");
      expect(content).toContain("router.post('/cancel'");
      expect(content).toContain("router.put('/config'");
      expect(content).toContain("router.post('/verify-domain'");
      expect(content).toContain("requireRole(['manager', 'admin', 'superadmin'])");
    });

    it('deve registrar a rota /api/addons no pipeline principal do Express em app.js', () => {
      const content = fs.readFileSync(appPath, 'utf8');
      expect(content).toContain("import addonRoutes from './routes/addons.js';");
      expect(content).toContain("app.use('/api/addons', addonRoutes);");
    });
  });

  describe('4. Integração no Faturamento SaaS (saasBillingService.js)', () => {
    const billingPath = path.join(rootDir, 'backend/services/saasBillingService.js');

    it('deve consultar complementos ativos e calcular addons_price e total_monthly_price', () => {
      const content = fs.readFileSync(billingPath, 'utf8');
      expect(content).toContain('public.cap_tenant_addons');
      expect(content).toContain('addons_price');
      expect(content).toContain('total_monthly_price');
      expect(content).toContain('active_addons');
    });
  });

  describe('5. Cliente Frontend e Componentes de UI (api.js, AssinaturaSaaS.jsx, ModalConfigurarAddon.jsx)', () => {
    it('deve conter o módulo api.addons no cliente frontend src/lib/api.js', () => {
      const apiPath = path.join(rootDir, 'src/lib/api.js');
      const content = fs.readFileSync(apiPath, 'utf8');
      expect(content).toContain('addons: {');
      expect(content).toContain('listAvailable()');
      expect(content).toContain('getTenantAddons(');
      expect(content).toContain('subscribe(');
      expect(content).toContain('cancel(');
      expect(content).toContain('verifyDomain(');
    });

    it('deve conter o componente ModalConfigurarAddon.jsx com suporte a CNAME e dados fiscais', () => {
      const modalPath = path.join(rootDir, 'src/components/admin/ModalConfigurarAddon.jsx');
      expect(fs.existsSync(modalPath)).toBe(true);
      const content = fs.readFileSync(modalPath, 'utf8');
      expect(content).toContain('cname.operabeauty.com.br');
      expect(content).toContain('api.addons.verifyDomain');
      expect(content).toContain('inscricao_municipal');
    });

    it('deve renderizar a seção de complementos com cards de WhatsApp, Domínio e NFS-e em AssinaturaSaaS.jsx', () => {
      const assinaturaPath = path.join(rootDir, 'src/pages/admin/AssinaturaSaaS.jsx');
      const content = fs.readFileSync(assinaturaPath, 'utf8');
      expect(content).toContain('Complementos & Add-ons para o seu Salão');
      expect(content).toContain('Pacote Extra de WhatsApp');
      expect(content).toContain('Domínio Próprio');
      expect(content).toContain('Emissão Fiscal NFS-e');
      expect(content).toContain('ModalConfigurarAddon');
      expect(content).toContain('handleSubscribeAddon');
      expect(content).toContain('handleCancelAddon');
    });
  });

});
