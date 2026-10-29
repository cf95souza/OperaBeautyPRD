import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C2 (P0) — Bloqueio Estrito de Agendamento Duplo Concorrente', () => {
  const servicePath = path.join(rootDir, 'backend/services/appointmentService.js');
  const routesPath = path.join(rootDir, 'backend/routes/appointments.js');
  const migrationPath = path.join(rootDir, 'migrations/phase12_prevent_double_booking.sql');
  const databaseDocPath = path.join(rootDir, 'database.md');
  const initSqlPath = path.join(rootDir, 'init.sql');

  test('Todos os arquivos de migração, serviço, rotas e schema devem existir', () => {
    expect(fs.existsSync(servicePath)).toBe(true);
    expect(fs.existsSync(routesPath)).toBe(true);
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(databaseDocPath)).toBe(true);
    expect(fs.existsSync(initSqlPath)).toBe(true);
  });

  describe('Estrutura e Migração no Banco de Dados (PostgreSQL / btree_gist)', () => {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const databaseDoc = fs.readFileSync(databaseDocPath, 'utf8');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    test('Deve habilitar a extensão btree_gist', () => {
      expect(migrationContent).toMatch(/CREATE EXTENSION IF NOT EXISTS btree_gist/);
      expect(databaseDoc).toMatch(/btree_gist/);
      expect(initSql).toMatch(/btree_gist/);
    });

    test('Deve criar exclusion constraint no_overlapping_appointments com tipo GiST e intervalo tstzrange', () => {
      const constraintRegex = /CONSTRAINT\s+no_overlapping_appointments\s+EXCLUDE\s+USING\s+gist/i;
      expect(migrationContent).toMatch(constraintRegex);
      expect(databaseDoc).toMatch(constraintRegex);
      expect(initSql).toMatch(constraintRegex);
      expect(migrationContent).toMatch(/tstzrange\(start_time,\s*end_time\)\s+WITH\s+&&/);
    });

    test('Deve ignorar agendamentos com status cancelled na restrição de sobreposição', () => {
      expect(migrationContent).toMatch(/WHERE\s*\(\s*status\s*<>\s*'cancelled'\s*\)/i);
      expect(databaseDoc).toMatch(/WHERE\s*\(\s*status\s*<>\s*'cancelled'\s*\)/i);
      expect(initSql).toMatch(/WHERE\s*\(\s*status\s*<>\s*'cancelled'\s*\)/i);
    });
  });

  describe('Serviço de Agendamento (appointmentService.js)', () => {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    test('createAppointment deve aplicar bloqueio pessimista (FOR UPDATE) no profissional', () => {
      expect(serviceContent).toMatch(/SELECT id FROM public\.cap_staff WHERE id = \$1 AND tenant_id = \$2 FOR UPDATE/);
    });

    test('createAppointment deve validar atômica e explicitamente se há sobreposição de horário', () => {
      expect(serviceContent).toMatch(/SELECT id FROM public\.cap_appointments/);
      expect(serviceContent).toMatch(/start_time < \$4/);
      expect(serviceContent).toMatch(/end_time > \$3/);
      expect(serviceContent).toMatch(/status <> 'cancelled'/);
    });

    test('createAppointment deve retornar erro 409 amigável em caso de conflito de horário', () => {
      expect(serviceContent).toMatch(/Esse horário acabou de ser ocupado\. Por favor, escolha outro horário\./);
      expect(serviceContent).toMatch(/error\.statusCode = 409/);
    });

    test('createAppointment deve capturar erro de exclusion constraint 23P01 e mapear para 409', () => {
      expect(serviceContent).toMatch(/error\.code === '23P01' \|\| error\.constraint === 'no_overlapping_appointments'/);
    });

    test('updateAppointment deve validar conflito de horário ao reagendar e capturar 23P01', () => {
      expect(serviceContent).toMatch(/id <> \$5/);
      expect(serviceContent).toMatch(/updateAppointment[\s\S]*?Esse horário acabou de ser ocupado/);
    });
  });

  describe('Rotas e Tratamento de Erros HTTP (routes/appointments.js)', () => {
    const routesContent = fs.readFileSync(routesPath, 'utf8');

    test('Deve interceptar código 23P01 e constraint no_overlapping_appointments retornando HTTP 409', () => {
      expect(routesContent).toMatch(/if \(error\.code === '23P01' \|\| error\.constraint === 'no_overlapping_appointments'\)/);
      expect(routesContent).toMatch(/return res\.status\(409\)\.json\(\{ error: 'Esse horário acabou de ser ocupado\. Por favor, escolha outro horário\.' \}\)/);
    });
  });
});
