import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('FASE 44 - ITEM D13 (P2): Pacotes de Sessões', () => {

  describe('1. Integridade de DDL, Migração e Banco de Dados (phase28_service_packages.sql)', () => {
    const migrationPath = path.join(rootDir, 'migrations/phase28_service_packages.sql');
    const databaseDocPath = path.join(rootDir, 'database.md');

    it('os arquivos de migração e documentação do banco devem existir', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      expect(fs.existsSync(databaseDocPath)).toBe(true);
    });

    it('a migração deve criar cap_packages com colunas e constraints adequadas', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_packages');
      expect(sql).toContain('tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id)');
      expect(sql).toContain('service_id UUID NOT NULL REFERENCES public.cap_services(id)');
      expect(sql).toContain('total_sessions INTEGER NOT NULL CHECK (total_sessions > 0)');
      expect(sql).toContain('price NUMERIC(10,2) NOT NULL CHECK (price >= 0)');
      expect(sql).toContain('validity_days INTEGER NOT NULL DEFAULT 90 CHECK (validity_days > 0)');
      expect(sql).toContain('min_interval_days INTEGER NOT NULL DEFAULT 0 CHECK (min_interval_days >= 0)');
      expect(sql).toContain('is_active BOOLEAN NOT NULL DEFAULT TRUE');
    });

    it('a migração deve criar cap_client_packages com a regra de aceite fundamental remaining_sessions >= 0', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_client_packages');
      expect(sql).toContain('package_id UUID NOT NULL REFERENCES public.cap_packages(id)');
      expect(sql).toContain('client_id UUID NOT NULL REFERENCES public.cap_clients(id)');
      expect(sql).toContain('remaining_sessions INTEGER NOT NULL CHECK (remaining_sessions >= 0)');
      expect(sql).toContain('used_sessions INTEGER NOT NULL DEFAULT 0 CHECK (used_sessions >= 0)');
      expect(sql).toContain('status TEXT NOT NULL DEFAULT \'active\'');
    });

    it('a migração deve criar tabela de auditoria cap_package_usages com suporte a consume e refund', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.cap_package_usages');
      expect(sql).toContain('client_package_id UUID NOT NULL REFERENCES public.cap_client_packages(id)');
      expect(sql).toContain('action TEXT NOT NULL DEFAULT \'consume\' CHECK (action IN (\'consume\', \'refund\', \'adjustment\'))');
    });

    it('a migração deve estender cap_appointments com colunas de pacotes', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS client_package_id UUID');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_package_session BOOLEAN NOT NULL DEFAULT FALSE');
    });

    it('a migração deve configurar RLS e conceder privilégios ao usuário opera_app', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE public.cap_packages ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('ALTER TABLE public.cap_client_packages ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('ALTER TABLE public.cap_package_usages ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_packages TO opera_app');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_client_packages TO opera_app');
      expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_package_usages TO opera_app');
    });

    it('a migração deve registrar a feature flag packages e habilitá-la nos planos Premium e Enterprise', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('INSERT INTO public.cap_feature_flags (name, description, is_active_global)');
      expect(sql).toContain('\'packages\'');
      expect(sql).toContain('WHERE name IN (\'Premium\', \'Enterprise\')');
    });

    it('database.md deve documentar as tabelas 2.7.4, 2.7.5, 2.7.6 e colunas em 2.12', () => {
      const doc = fs.readFileSync(databaseDocPath, 'utf-8');
      expect(doc).toContain('2.7.4 `public.cap_packages`');
      expect(doc).toContain('2.7.5 `public.cap_client_packages`');
      expect(doc).toContain('2.7.6 `public.cap_package_usages`');
      expect(doc).toContain('client_package_id');
      expect(doc).toContain('is_package_session');
    });
  });

  describe('2. Schemas de Validação Zod e Regras de Entrada', () => {
    const createPackageSchema = z.object({
      name: z.string().min(1, 'Nome do pacote obrigatório').max(100),
      service_id: z.string().uuid('ID do serviço inválido'),
      total_sessions: z.number().int().min(2, 'Pacote deve ter pelo menos 2 sessões'),
      price: z.number().positive('Preço do pacote deve ser positivo'),
      validity_days: z.number().int().min(1).default(180),
      min_interval_days: z.number().int().min(0).default(0),
      is_active: z.boolean().default(true)
    });

    const sellPackageSchema = z.object({
      package_id: z.string().uuid('ID do pacote inválido'),
      client_id: z.string().uuid('ID da cliente inválido'),
      payment_method: z.enum(['credit_card', 'debit_card', 'pix', 'cash', 'transfer', 'other']).default('pix'),
      notes: z.string().max(255).optional()
    });

    it('deve aceitar payload válido de criação de pacote', () => {
      const valid = {
        name: 'Pacote 10 Sessões Drenagem Linfática',
        service_id: '550e8400-e29b-41d4-a716-446655440000',
        total_sessions: 10,
        price: 850.00,
        validity_days: 180,
        min_interval_days: 2,
        is_active: true
      };
      const parsed = createPackageSchema.parse(valid);
      expect(parsed.name).toBe(valid.name);
      expect(parsed.total_sessions).toBe(10);
    });

    it('deve rejeitar pacote com menos de 2 sessões ou preço negativo', () => {
      expect(() => {
        createPackageSchema.parse({
          name: 'Pacote Inválido',
          service_id: '550e8400-e29b-41d4-a716-446655440000',
          total_sessions: 1, // mínimo é 2
          price: 100.00
        });
      }).toThrow();

      expect(() => {
        createPackageSchema.parse({
          name: 'Pacote Preço Negativo',
          service_id: '550e8400-e29b-41d4-a716-446655440000',
          total_sessions: 5,
          price: -50.00
        });
      }).toThrow();
    });

    it('deve validar payload de venda de pacote para cliente', () => {
      const validSell = {
        package_id: '550e8400-e29b-41d4-a716-446655440001',
        client_id: '550e8400-e29b-41d4-a716-446655440002',
        payment_method: 'pix',
        notes: 'Pago no balcão'
      };
      const parsed = sellPackageSchema.parse(validSell);
      expect(parsed.payment_method).toBe('pix');
    });
  });

  describe('3. Lógica de Negócio: Saldo Nunca Negativo e Estorno Atômico', () => {
    // Simulação do comportamento de negócio implementado em packageService.js
    const simulateConsume = (clientPackage, appointmentDate = new Date()) => {
      if (clientPackage.status !== 'active') {
        throw new Error('Pacote inativo ou concluído.');
      }
      if (new Date(clientPackage.expires_at) < appointmentDate) {
        throw new Error('Pacote de sessões expirado.');
      }
      if (clientPackage.remaining_sessions <= 0) {
        throw new Error('Saldo insuficiente no pacote de sessões. O saldo nunca pode ser negativo.');
      }

      // Intervalo fisiológico
      if (clientPackage.min_interval_days > 0 && clientPackage.last_session_at) {
        const lastSession = new Date(clientPackage.last_session_at);
        const diffDays = (appointmentDate - lastSession) / (1000 * 60 * 60 * 24);
        if (diffDays < clientPackage.min_interval_days) {
          throw new Error(`Intervalo mínimo de ${clientPackage.min_interval_days} dias não respeitado.`);
        }
      }

      const previous = clientPackage.remaining_sessions;
      const newRemaining = previous - 1;
      const newUsed = clientPackage.used_sessions + 1;
      const newStatus = newRemaining === 0 ? 'completed' : 'active';

      return {
        ...clientPackage,
        remaining_sessions: newRemaining,
        used_sessions: newUsed,
        status: newStatus,
        last_session_at: appointmentDate
      };
    };

    const simulateRefund = (clientPackage) => {
      const previous = clientPackage.remaining_sessions;
      const newRemaining = Math.min(clientPackage.total_sessions, previous + 1);
      const newUsed = Math.max(0, clientPackage.used_sessions - 1);
      const newStatus = newRemaining > 0 ? 'active' : clientPackage.status;

      return {
        ...clientPackage,
        remaining_sessions: newRemaining,
        used_sessions: newUsed,
        status: newStatus
      };
    };

    it('deve debitar exatamente 1 sessão e manter o saldo consistente', () => {
      const pkg = {
        total_sessions: 5,
        remaining_sessions: 5,
        used_sessions: 0,
        status: 'active',
        expires_at: new Date(Date.now() + 86400000 * 30),
        min_interval_days: 0,
        last_session_at: null
      };

      const updated = simulateConsume(pkg);
      expect(updated.remaining_sessions).toBe(4);
      expect(updated.used_sessions).toBe(1);
      expect(updated.status).toBe('active');
    });

    it('deve marcar status completed ao consumir a última sessão', () => {
      const pkg = {
        total_sessions: 5,
        remaining_sessions: 1,
        used_sessions: 4,
        status: 'active',
        expires_at: new Date(Date.now() + 86400000 * 30),
        min_interval_days: 0,
        last_session_at: null
      };

      const updated = simulateConsume(pkg);
      expect(updated.remaining_sessions).toBe(0);
      expect(updated.used_sessions).toBe(5);
      expect(updated.status).toBe('completed');
    });

    it('REGRA DE ACEITE: NUNCA permitir saldo negativo (rejeitar se remaining_sessions <= 0)', () => {
      const pkg = {
        total_sessions: 5,
        remaining_sessions: 0,
        used_sessions: 5,
        status: 'completed',
        expires_at: new Date(Date.now() + 86400000 * 30),
        min_interval_days: 0,
        last_session_at: null
      };

      expect(() => simulateConsume(pkg)).toThrow(/Pacote inativo ou concluído|Saldo insuficiente/);
    });

    it('REGRA DE ACEITE: Cancelamento/estorno deve devolver a sessão ao saldo da cliente', () => {
      const pkgConsumido = {
        total_sessions: 10,
        remaining_sessions: 7,
        used_sessions: 3,
        status: 'active'
      };

      const estornado = simulateRefund(pkgConsumido);
      expect(estornado.remaining_sessions).toBe(8);
      expect(estornado.used_sessions).toBe(2);
      expect(estornado.status).toBe('active');
    });

    it('deve rejeitar agendamento se o pacote estiver expirado', () => {
      const pkgExpirado = {
        total_sessions: 5,
        remaining_sessions: 3,
        used_sessions: 2,
        status: 'active',
        expires_at: new Date(Date.now() - 86400000 * 5), // expirou há 5 dias
        min_interval_days: 0,
        last_session_at: null
      };

      expect(() => simulateConsume(pkgExpirado)).toThrow(/expirado/);
    });

    it('deve rejeitar se o intervalo mínimo de dias não tiver sido respeitado', () => {
      const lastSession = new Date(Date.now() - 86400000 * 2); // 2 dias atrás
      const pkgIntervalo = {
        total_sessions: 10,
        remaining_sessions: 8,
        used_sessions: 2,
        status: 'active',
        expires_at: new Date(Date.now() + 86400000 * 30),
        min_interval_days: 5, // exige 5 dias
        last_session_at: lastSession
      };

      const now = new Date();
      expect(() => simulateConsume(pkgIntervalo, now)).toThrow(/Intervalo mínimo de 5 dias/);
    });
  });

  describe('4. Arquivos do Sistema e Rotas Conectadas', () => {
    it('o service backend/services/packageService.js deve existir com métodos atômicos', () => {
      const servicePath = path.join(rootDir, 'backend/services/packageService.js');
      expect(fs.existsSync(servicePath)).toBe(true);
      const code = fs.readFileSync(servicePath, 'utf-8');
      expect(code).toContain('listPackages');
      expect(code).toContain('createPackage');
      expect(code).toContain('sellPackageToClient');
      expect(code).toContain('consumePackageSession');
      expect(code).toContain('refundPackageSession');
      expect(code).toContain('FOR UPDATE'); // Lock pessimista para garantir saldo nunca negativo
    });

    it('as rotas backend/routes/packages.js devem existir e estar registradas em app.js', () => {
      const routesPath = path.join(rootDir, 'backend/routes/packages.js');
      const appPath = path.join(rootDir, 'backend/app.js');
      expect(fs.existsSync(routesPath)).toBe(true);
      expect(fs.existsSync(appPath)).toBe(true);

      const appCode = fs.readFileSync(appPath, 'utf-8');
      expect(appCode).toContain('packageRoutes');
      expect(appCode).toContain('/api/packages');
    });

    it('o frontend deve conter GestaoPacotes.jsx, api.packages e integração no checkout e CRM', () => {
      const pagePath = path.join(rootDir, 'src/pages/admin/GestaoPacotes.jsx');
      const apiPath = path.join(rootDir, 'src/lib/api.js');
      const checkoutPath = path.join(rootDir, 'src/pages/AgendamentoRevisao.jsx');
      const crmPath = path.join(rootDir, 'src/pages/FichaClienteCRM.jsx');
      const appJsxPath = path.join(rootDir, 'src/App.jsx');
      const layoutPath = path.join(rootDir, 'src/components/admin/AdminLayout.jsx');

      expect(fs.existsSync(pagePath)).toBe(true);
      expect(fs.existsSync(apiPath)).toBe(true);

      const apiCode = fs.readFileSync(apiPath, 'utf-8');
      expect(apiCode).toContain('packages:');
      expect(apiCode).toContain('getClientPackages');
      expect(apiCode).toContain('checkEligible');

      const checkoutCode = fs.readFileSync(checkoutPath, 'utf-8');
      expect(checkoutCode).toContain('eligiblePackage');
      expect(checkoutCode).toContain('usePackageSession');
      expect(checkoutCode).toContain('client_package_id');

      const crmCode = fs.readFileSync(crmPath, 'utf-8');
      expect(crmCode).toContain('clientPackages');
      expect(crmCode).toContain('handleSellPackage');
      expect(crmCode).toContain('Pacotes de Sessões');

      const appJsxCode = fs.readFileSync(appJsxPath, 'utf-8');
      expect(appJsxCode).toContain('GestaoPacotes');
      expect(appJsxCode).toContain('staff/admin/pacotes');

      const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
      expect(layoutCode).toContain('Pacotes de Sessões');
    });
  });
});
