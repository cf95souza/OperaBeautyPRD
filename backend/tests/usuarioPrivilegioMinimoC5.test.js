import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C5 (P1) — Usuário de Banco com Privilégio Mínimo (opera_app vs postgres)', () => {
  const migrationPath = path.join(rootDir, 'migrations/phase14_least_privilege_user.sql');
  const databaseDocPath = path.join(rootDir, 'database.md');
  const initSqlPath = path.join(rootDir, 'init.sql');
  const dbConfigPath = path.join(rootDir, 'backend/config/db.js');
  const envExamplePath = path.join(rootDir, '.env.example');

  test('Todos os arquivos de migração, documentação, schemas e configuração devem existir', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(databaseDocPath)).toBe(true);
    expect(fs.existsSync(initSqlPath)).toBe(true);
    expect(fs.existsSync(dbConfigPath)).toBe(true);
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  describe('Migração DDL (phase14_least_privilege_user.sql)', () => {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    test('Deve criar o role opera_app de forma idempotente com login e senha', () => {
      expect(migrationContent).toMatch(/CREATE ROLE opera_app WITH LOGIN/);
      expect(migrationContent).toMatch(/IF NOT EXISTS/);
    });

    test('Deve retirar todos os privilégios administrativos (NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOBYPASSRLS)', () => {
      expect(migrationContent).toMatch(/NOSUPERUSER/);
      expect(migrationContent).toMatch(/NOCREATEDB/);
      expect(migrationContent).toMatch(/NOCREATEROLE/);
      expect(migrationContent).toMatch(/NOBYPASSRLS/);
    });

    test('Deve revogar permissão de criação no schema public de PUBLIC', () => {
      expect(migrationContent).toMatch(/REVOKE CREATE ON SCHEMA public FROM PUBLIC/);
    });

    test('Deve conceder estritamente DML (SELECT, INSERT, UPDATE, DELETE) nas tabelas do schema public', () => {
      expect(migrationContent).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opera_app/);
    });

    test('Deve conceder permissão em sequências e rotinas', () => {
      expect(migrationContent).toMatch(/GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app/);
      expect(migrationContent).toMatch(/GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO opera_app/);
    });

    test('Deve configurar privilégios padrão para futuros objetos criados por migrações', () => {
      expect(migrationContent).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opera_app/);
    });

    test('NÃO deve conceder privilégios amplos (GRANT ALL PRIVILEGES) que permitam DDL destrutivo', () => {
      expect(migrationContent).not.toMatch(/GRANT ALL PRIVILEGES ON DATABASE/);
      expect(migrationContent).not.toMatch(/GRANT ALL ON ALL TABLES IN SCHEMA public TO opera_app/);
    });
  });

  describe('Sincronização em database.md e init.sql (Unificado)', () => {
    const databaseDoc = fs.readFileSync(databaseDocPath, 'utf8');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    test('database.md deve conter a Seção 15 formalizando a governança e o papel opera_app', () => {
      expect(databaseDoc).toMatch(/## 15\. Governança e Usuário com Privilégio Mínimo/);
      expect(databaseDoc).toMatch(/opera_app/);
      expect(databaseDoc).toMatch(/postgres/);
    });

    test('init.sql unificado deve conter a criação e grants de opera_app', () => {
      expect(initSql).toMatch(/CREATE ROLE opera_app/);
      expect(initSql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES/);
    });
  });

  describe('Configuração de Runtime no Backend (db.js)', () => {
    const dbConfig = fs.readFileSync(dbConfigPath, 'utf8');

    test('db.js deve carregar o usuário de banco de forma configurável via process.env.DB_USER', () => {
      expect(dbConfig).toMatch(/user:\s*process\.env\.DB_USER/);
    });
  });
});
