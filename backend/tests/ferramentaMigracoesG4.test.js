// ==============================================================================
// OperaBeauty SaaS - Testes da Ferramenta de Migrações com Rollback (Item G4 - P1)
// ==============================================================================

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  parseMigrationSql,
  createMigrationFile,
  getMigrationStatus,
  runMigrateUp,
  runMigrateDown,
  runMigrateBaseline
} from '../../scripts/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const testMigrationsDir = path.join(rootDir, 'migrations_test_g4');

describe('G4 (P1) — Ferramenta de Migrações de Banco de Dados com Rollback', () => {

  // ============================================================================
  // 1. Parser de Arquivos SQL (UP / DOWN / Checksum)
  // ============================================================================
  describe('Parser de Migrações (parseMigrationSql)', () => {
    it('deve extrair blocos UP e DOWN com delimitadores no padrão >>> UP >>> e >>> DOWN >>>', () => {
      const sql = `
-- >>> UP >>>
CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));
CREATE INDEX idx_test_name ON test_table(name);

-- >>> DOWN >>>
DROP TABLE IF EXISTS test_table CASCADE;
      `;

      const parsed = parseMigrationSql(sql);
      expect(parsed.up).toContain('CREATE TABLE test_table');
      expect(parsed.up).toContain('CREATE INDEX idx_test_name');
      expect(parsed.down).toBe('DROP TABLE IF EXISTS test_table CASCADE;');
      expect(parsed.hasRollback).toBe(true);
      expect(parsed.checksum).toHaveLength(64);
    });

    it('deve aceitar delimitadores simplificados como -- UP e -- DOWN', () => {
      const sql = `
-- UP
ALTER TABLE customers ADD COLUMN notes TEXT;

-- DOWN
ALTER TABLE customers DROP COLUMN IF EXISTS notes;
      `;

      const parsed = parseMigrationSql(sql);
      expect(parsed.up).toBe('ALTER TABLE customers ADD COLUMN notes TEXT;');
      expect(parsed.down).toBe('ALTER TABLE customers DROP COLUMN IF EXISTS notes;');
      expect(parsed.hasRollback).toBe(true);
    });

    it('deve tratar todo o conteúdo como UP se não houver delimitadores explícitos', () => {
      const sql = `CREATE TABLE audit_logs (id INT PRIMARY KEY);`;
      const parsed = parseMigrationSql(sql);

      expect(parsed.up).toBe(sql);
      expect(parsed.down).toBe('');
      expect(parsed.hasRollback).toBe(false);
      expect(parsed.checksum).toBe(crypto.createHash('sha256').update(sql).digest('hex'));
    });

    it('deve gerar checksum SHA-256 consistente para o mesmo conteúdo', () => {
      const content = 'SELECT 1;';
      const parsed1 = parseMigrationSql(content);
      const parsed2 = parseMigrationSql(content);

      expect(parsed1.checksum).toBe(parsed2.checksum);
    });
  });

  // ============================================================================
  // 2. Criação de Novos Arquivos de Migração (createMigrationFile)
  // ============================================================================
  describe('Criação de Arquivos (createMigrationFile)', () => {
    const createdFiles = [];

    afterEach(() => {
      createdFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      createdFiles.length = 0;
    });

    it('deve gerar arquivo com timestamp e nome sanitizado', () => {
      const filePath = createMigrationFile('adicionar_campo_cpf! cliente');
      createdFiles.push(filePath);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toMatch(/\d{14}_adicionar_campo_cpf__cliente\.sql$/);

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('-- >>> UP >>>');
      expect(content).toContain('-- >>> DOWN >>>');
    });
  });

  // ============================================================================
  // 3. Execução Transacional com Mock do Pool do PostgreSQL
  // ============================================================================
  describe('Execução do Motor com Mock de Pool', () => {
    let mockClient;
    let mockPool;
    let queryHistory;

    beforeEach(() => {
      queryHistory = [];
      mockClient = {
        query: jest.fn(async (sql, params) => {
          queryHistory.push({ sql: sql.trim(), params });

          // Mock da tabela de migrações
          if (sql.includes('CREATE TABLE IF NOT EXISTS public.cap_schema_migrations')) {
            return { rows: [] };
          }
          if (sql.includes('SELECT name, batch, executed_at FROM public.cap_schema_migrations')) {
            return {
              rows: [
                { name: '20261029100000_init.sql', batch: 1, executed_at: new Date('2026-10-29T10:00:00Z') }
              ]
            };
          }
          if (sql.includes('SELECT name FROM public.cap_schema_migrations')) {
            return {
              rows: [
                { name: '20261029100000_init.sql' }
              ]
            };
          }
          if (sql.includes('SELECT COALESCE(MAX(batch), 0) + 1 AS next_batch')) {
            return { rows: [{ next_batch: 2 }] };
          }
          if (sql.includes('SELECT MAX(batch) as max_batch')) {
            return { rows: [{ max_batch: 2 }] };
          }
          if (sql.includes('SELECT id, name FROM public.cap_schema_migrations WHERE batch = $1')) {
            return {
              rows: [
                { id: 42, name: '20261029110000_novo_modulo.sql' }
              ]
            };
          }
          if (sql.includes('INSERT INTO public.cap_schema_migrations')) {
            return { rowCount: 1 };
          }
          if (sql.includes('DELETE FROM public.cap_schema_migrations')) {
            return { rowCount: 1 };
          }

          return { rows: [], rowCount: 1 };
        }),
        release: jest.fn()
      };

      mockPool = {
        connect: jest.fn(async () => mockClient)
      };
    });

    it('runMigrateUp: deve executar migração pendente dentro de transação BEGIN/COMMIT', async () => {
      // Cria temporariamente um arquivo de migração novo no diretório de migrações real
      const testFile = path.join(rootDir, 'migrations', '99999999999999_teste_up_g4.sql');
      fs.writeFileSync(testFile, '-- >>> UP >>>\nCREATE TABLE test_up (id INT);\n-- >>> DOWN >>>\nDROP TABLE test_up;\n', 'utf8');

      try {
        const result = await runMigrateUp(mockPool);

        expect(result.appliedCount).toBeGreaterThanOrEqual(1);
        expect(result.appliedFiles).toContain('99999999999999_teste_up_g4.sql');

        // Valida que transação foi aberta e fechada
        const queries = queryHistory.map(q => q.sql);
        expect(queries).toContain('BEGIN');
        expect(queries).toContain('CREATE TABLE test_up (id INT);');
        expect(queries).toContain('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      } finally {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('runMigrateUp: deve realizar ROLLBACK se a query falhar durante a migração', async () => {
      const failingClient = {
        query: jest.fn(async (sql) => {
          if (sql.includes('SELECT name FROM public.cap_schema_migrations')) {
            return { rows: [] };
          }
          if (sql.includes('SELECT COALESCE(MAX(batch), 0) + 1 AS next_batch')) {
            return { rows: [{ next_batch: 2 }] };
          }
          if (sql.includes('FAIL_SYNTAX')) {
            throw new Error('Erro de sintaxe simulado no PostgreSQL');
          }
          return { rows: [] };
        }),
        release: jest.fn()
      };
      const failingPool = { connect: async () => failingClient };

      const testFile = path.join(rootDir, 'migrations', '99999999999998_teste_falha.sql');
      fs.writeFileSync(testFile, '-- >>> UP >>>\nFAIL_SYNTAX;\n-- >>> DOWN >>>\n', 'utf8');

      try {
        await expect(runMigrateUp(failingPool)).rejects.toThrow('Erro de sintaxe simulado');
        expect(failingClient.query).toHaveBeenCalledWith('ROLLBACK');
      } finally {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('runMigrateDown: deve executar o bloco DOWN e remover registro da tabela de migrações', async () => {
      const testFile = path.join(rootDir, 'migrations', '20261029110000_novo_modulo.sql');
      fs.writeFileSync(testFile, '-- >>> UP >>>\nCREATE TABLE novo_modulo (id INT);\n-- >>> DOWN >>>\nDROP TABLE novo_modulo;\n', 'utf8');

      try {
        const result = await runMigrateDown(mockPool);

        expect(result.rolledBackCount).toBe(1);
        expect(result.rolledBackFiles).toContain('20261029110000_novo_modulo.sql');

        const queries = queryHistory.map(q => q.sql);
        expect(queries).toContain('BEGIN');
        expect(queries).toContain('DROP TABLE novo_modulo;');
        expect(queries).toContain('DELETE FROM public.cap_schema_migrations WHERE id = $1');
        expect(queries).toContain('COMMIT');
      } finally {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('runMigrateBaseline: deve registrar migrações com ON CONFLICT DO NOTHING', async () => {
      const result = await runMigrateBaseline(mockPool);
      expect(result).toHaveProperty('count');

      const baselineQuery = queryHistory.find(q => q.sql.includes('ON CONFLICT (name) DO NOTHING'));
      expect(baselineQuery).toBeDefined();
    });

    it('getMigrationStatus: deve listar corretamente arquivos de migração e status de aplicação', async () => {
      const statusList = await getMigrationStatus(mockPool);
      expect(Array.isArray(statusList)).toBe(true);

      const initMig = statusList.find(s => s.name === '20261029100000_init.sql');
      if (initMig) {
        expect(initMig.applied).toBe(true);
        expect(initMig.batch).toBe(1);
      }
    });
  });
});
