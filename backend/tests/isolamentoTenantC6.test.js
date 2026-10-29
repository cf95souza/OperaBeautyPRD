import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C6 (P1) — Isolamento por Tenant em Profundidade (RLS, tenantQuery e Proibição de pool nas rotas)', () => {
  const routesDir = path.join(rootDir, 'backend/routes');
  const tenantQueryPath = path.join(rootDir, 'backend/utils/tenantQuery.js');
  const migrationPath = path.join(rootDir, 'migrations/phase15_enable_rls_tenant_isolation.sql');
  const databaseDocPath = path.join(rootDir, 'database.md');
  const initSqlPath = path.join(rootDir, 'init.sql');

  test('Arquivos fundamentais de isolamento multi-tenant devem existir', () => {
    expect(fs.existsSync(tenantQueryPath)).toBe(true);
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(databaseDocPath)).toBe(true);
    expect(fs.existsSync(initSqlPath)).toBe(true);
  });

  describe('Proibição de pool.query direto nas rotas Express (Desacoplamento por Services)', () => {
    test('Nenhuma rota de domínio de negócio em backend/routes deve importar pool diretamente', () => {
      // Rotas de infraestrutura e gateways de webhook operam no nível de conexão global
      const infraRoutes = new Set(['payments.js', 'privateUploads.js', 'referral.js', 'reseller.js', 'whatsappRoutes.js']);
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && !infraRoutes.has(f));
      const violations = [];

      for (const file of routeFiles) {
        const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
        if (/import\s+pool\s+from/i.test(content) || /require\(['"][^'"]*db\.js['"]\)/i.test(content)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });

    test('Todos os serviços desacoplados (waitlist, term, consent, review, report, referral) devem existir', () => {
      const services = [
        'waitlistService.js',
        'termService.js',
        'consentService.js',
        'reviewService.js',
        'reportService.js',
        'referralService.js'
      ];

      for (const s of services) {
        const fullPath = path.join(rootDir, 'backend/services', s);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content).toMatch(/tenantQuery/);
      }
    });
  });

  describe('Helper de Consulta Segura (tenantQuery.js)', () => {
    test('tenantQuery deve rejeitar consultas sem tenant_id se não for superadmin (Fail Closed)', async () => {
      const { tenantQuery } = await import('../utils/tenantQuery.js');

      await expect(tenantQuery(null, 'SELECT 1')).rejects.toThrow(/tenant_id é estritamente obrigatório/);
      await expect(tenantQuery('', 'SELECT 1')).rejects.toThrow(/tenant_id é estritamente obrigatório/);
      await expect(tenantQuery('   ', 'SELECT 1')).rejects.toThrow(/tenant_id é estritamente obrigatório/);
    });

    test('tenantTransaction deve rejeitar transações sem tenant_id se não for superadmin', async () => {
      const { tenantTransaction } = await import('../utils/tenantQuery.js');

      await expect(tenantTransaction(null, async () => {})).rejects.toThrow(/tenant_id é estritamente obrigatório/);
    });
  });

  describe('Migração DDL de RLS (phase15_enable_rls_tenant_isolation.sql)', () => {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    test('Deve habilitar Row Level Security (ENABLE ROW LEVEL SECURITY)', () => {
      expect(migrationContent).toMatch(/ENABLE ROW LEVEL SECURITY/);
    });

    test('Deve criar política tenant_isolation_policy com app.current_tenant_id', () => {
      expect(migrationContent).toMatch(/CREATE POLICY tenant_isolation_policy/);
      expect(migrationContent).toMatch(/current_setting\(''app\.current_tenant_id'', true\)\s*=\s*tenant_id::text/);
    });

    test('Deve suportar bypass para superadmin', () => {
      expect(migrationContent).toMatch(/current_setting\(''app\.is_superadmin'', true\)\s*=\s*''true''/);
    });
  });

  describe('Sincronização em database.md e init.sql (Unificado)', () => {
    const databaseDoc = fs.readFileSync(databaseDocPath, 'utf8');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    test('database.md deve conter a Seção 16 com a política de isolamento RLS', () => {
      expect(databaseDoc).toMatch(/## 16\. Isolamento por Tenant em Profundidade/);
      expect(databaseDoc).toMatch(/tenant_isolation_policy/);
      expect(databaseDoc).toMatch(/Fail Closed/);
    });

    test('init.sql unificado deve conter a Seção 8 com a política RLS', () => {
      expect(initSql).toMatch(/8\. ISOLAMENTO POR TENANT EM PROFUNDIDADE/);
      expect(initSql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    });
  });

  describe('Prevenção de IDOR e Isolamento de Dados', () => {
    test('Services devem aplicar cláusula tenant_id obrigatória junto aos IDs de recursos', () => {
      const appointmentService = fs.readFileSync(path.join(rootDir, 'backend/services/appointmentService.js'), 'utf8');
      const clientService = fs.readFileSync(path.join(rootDir, 'backend/services/clientService.js'), 'utf8');

      // Em updateAppointment e cancelAppointment deve haver tenant_id
      expect(appointmentService).toMatch(/WHERE\s+id\s*=\s*\$1\s+AND\s+tenant_id\s*=\s*\$2/i);
      // Em clientService deve haver tenant_id
      expect(clientService).toMatch(/tenant_id/);
    });
  });
});
