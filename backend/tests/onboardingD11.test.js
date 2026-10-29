import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CATALOG_TEMPLATES,
  getCatalogTemplates,
  getOnboardingStatus,
  applyCatalogTemplate,
  toggleDismissOnboarding,
  markQrCodeGenerated
} from '../services/onboardingService.js';
import {
  applyCatalogTemplateSchema,
  dismissOnboardingSchema
} from '../routes/onboarding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('D11 (P1) — Onboarding Guiado do Salão & Display de Balcão com QR Code', () => {

  describe('1. CATALOG_TEMPLATES & Catálogos-Modelo por Segmento', () => {
    test('Deve conter os 6 segmentos de beleza e estética exigidos pelo plano', () => {
      const keys = Object.keys(CATALOG_TEMPLATES);
      expect(keys).toContain('manicure');
      expect(keys).toContain('lash_brow');
      expect(keys).toContain('facial');
      expect(keys).toContain('massage');
      expect(keys).toContain('depilation');
      expect(keys).toContain('hair');
    });

    test('Cada segmento deve possuir ao menos 5 serviços com preços e durações válidas', () => {
      const segments = Object.values(CATALOG_TEMPLATES);
      expect(segments.length).toBe(6);

      for (const seg of segments) {
        expect(seg.key).toBeDefined();
        expect(seg.name).toBeDefined();
        expect(seg.description).toBeDefined();
        expect(Array.isArray(seg.services)).toBe(true);
        expect(seg.services.length).toBeGreaterThanOrEqual(5);

        for (const s of seg.services) {
          expect(s.name).toBeDefined();
          expect(s.name.trim().length).toBeGreaterThan(0);
          expect(s.duration_minutes).toBeGreaterThanOrEqual(5);
          expect(s.duration_minutes).toBeLessThanOrEqual(720);
          expect(s.price).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('getCatalogTemplates deve formatar os templates para consumo da API', () => {
      const templates = getCatalogTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(6);

      const manicure = templates.find(t => t.key === 'manicure');
      expect(manicure).toBeDefined();
      expect(manicure.name).toBe('Manicure & Nail Design');
      expect(manicure.servicesCount).toBe(manicure.services.length);
    });
  });

  describe('2. Schemas de Validação Zod (applyCatalogTemplateSchema e dismissOnboardingSchema)', () => {
    test('applyCatalogTemplateSchema deve validar segmento obrigatório válido', () => {
      const validPayload = {
        body: {
          segment: 'facial',
          services: [
            { name: 'Limpeza de Pele', duration_minutes: 60, price: 150.00 }
          ]
        }
      };
      const result = applyCatalogTemplateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    test('applyCatalogTemplateSchema deve rejeitar segmento inexistente', () => {
      const invalidPayload = {
        body: {
          segment: 'segmento_invalido'
        }
      };
      const result = applyCatalogTemplateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    test('applyCatalogTemplateSchema deve rejeitar serviço com duração negativa ou < 5', () => {
      const invalidPayload = {
        body: {
          segment: 'manicure',
          services: [
            { name: 'Unha Express', duration_minutes: 2, price: 30 }
          ]
        }
      };
      const result = applyCatalogTemplateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    test('dismissOnboardingSchema deve validar campo booleano dismissed', () => {
      const valid = dismissOnboardingSchema.safeParse({ body: { dismissed: true } });
      expect(valid.success).toBe(true);

      const invalid = dismissOnboardingSchema.safeParse({ body: { dismissed: 'string' } });
      expect(invalid.success).toBe(false);
    });
  });

  describe('3. Governança e Regras de Negócio no Código (Análise Estática)', () => {
    test('onboardingService.js deve utilizar transação atômica e RLS ao aplicar template', () => {
      const servicePath = path.join(__dirname, '../services/onboardingService.js');
      const content = fs.readFileSync(servicePath, 'utf8');

      expect(content).toContain('BEGIN');
      expect(content).toContain('COMMIT');
      expect(content).toContain('ROLLBACK');
      expect(content).toContain('SET LOCAL app.current_tenant_id');
      expect(content).toContain('redisClient.del');
      expect(content).toContain('logAudit');
      expect(content).toContain('APPLY_CATALOG_TEMPLATE');
    });

    test('onboardingService.js deve conter 6 etapas bem definidas no checklist', () => {
      const servicePath = path.join(__dirname, '../services/onboardingService.js');
      const content = fs.readFileSync(servicePath, 'utf8');

      expect(content).toContain("'services'");
      expect(content).toContain("'staff'");
      expect(content).toContain("'business_hours'");
      expect(content).toContain("'branding'");
      expect(content).toContain("'qr_code'");
      expect(content).toContain("'first_appointment'");
      expect(content).toContain('progress_percent');
    });

    test('routes/onboarding.js deve exigir autenticação e restringir papéis', () => {
      const routesPath = path.join(__dirname, '../routes/onboarding.js');
      const content = fs.readFileSync(routesPath, 'utf8');

      expect(content).toContain('authMiddleware');
      expect(content).toContain("requireRole(['manager', 'superadmin'])");
      expect(content).toContain("requireRole(['manager'])");
      expect(content).toContain('/status');
      expect(content).toContain('/catalog-templates');
      expect(content).toContain('/apply-catalog-template');
      expect(content).toContain('/dismiss');
      expect(content).toContain('/mark-qr-generated');
    });

    test('backend/app.js deve registrar a rota /api/onboarding', () => {
      const appPath = path.join(__dirname, '../app.js');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toContain("import onboardingRoutes from './routes/onboarding.js'");
      expect(content).toContain("app.use('/api/onboarding', onboardingRoutes)");
    });
  });

  describe('4. Migração SQL e Schema de Banco (phase25_onboarding_schema.sql)', () => {
    test('Arquivo de migração deve conter colunas de onboarding e concessão para opera_app', () => {
      const sqlPath = path.join(__dirname, '../migrations/phase25_onboarding_schema.sql');
      const content = fs.readFileSync(sqlPath, 'utf8');

      expect(content).toContain('onboarding_dismissed');
      expect(content).toContain('qr_code_generated_at');
      expect(content).toContain('GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app');
      expect(content).toContain('idx_cap_tenants_onboarding_status');
    });
  });
});
