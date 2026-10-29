// ==============================================================================
// OperaBeauty SaaS - Testes de Higiene do Repositório e Documentação (Item G6 - P2)
// ==============================================================================

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('G6 (P2) — Higiene do Repositório e Governança Documental', () => {

  it('1. Não deve conter o arquivo legado vercel.json na raiz do projeto', () => {
    const vercelJsonPath = path.join(rootDir, 'vercel.json');
    expect(fs.existsSync(vercelJsonPath)).toBe(false);
  });

  it('2. Não deve conter o arquivo legado init_database.sql duplicado (unificado em init.sql)', () => {
    const initDbPath = path.join(rootDir, 'init_database.sql');
    const initSqlPath = path.join(rootDir, 'init.sql');

    expect(fs.existsSync(initDbPath)).toBe(false);
    expect(fs.existsSync(initSqlPath)).toBe(true);
  });

  it('3. init.sql deve conter toda a estrutura consolidada com RLS e extensões', () => {
    const initSqlPath = path.join(rootDir, 'init.sql');
    const content = fs.readFileSync(initSqlPath, 'utf8');

    expect(content).toMatch(/CREATE TABLE (?:IF NOT EXISTS )?public\.cap_tenants/i);
    expect(content).toMatch(/CREATE TABLE (?:IF NOT EXISTS )?public\.cap_plans/i);
    expect(content).toMatch(/CREATE TABLE (?:IF NOT EXISTS )?public\.cap_appointments/i);
    expect(content).toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  it('4. Não deve conter scripts soltos de teste (test_*.js) na raiz do repositório', () => {
    const rootFiles = fs.readdirSync(rootDir);
    const testFilesOnRoot = rootFiles.filter(f => /^test_.*\.js$/i.test(f));
    expect(testFilesOnRoot).toEqual([]);
  });

  it('5. Documentação modularizada: docs/arquitetura.md, docs/deploy.md e docs/changelog.md devem existir', () => {
    const arqPath = path.join(rootDir, 'docs/arquitetura.md');
    const deployPath = path.join(rootDir, 'docs/deploy.md');
    const changePath = path.join(rootDir, 'docs/changelog.md');
    const migPath = path.join(rootDir, 'docs/migracoes.md');
    const monPath = path.join(rootDir, 'docs/monitoramento.md');

    expect(fs.existsSync(arqPath)).toBe(true);
    expect(fs.existsSync(deployPath)).toBe(true);
    expect(fs.existsSync(changePath)).toBe(true);
    expect(fs.existsSync(migPath)).toBe(true);
    expect(fs.existsSync(monPath)).toBe(true);
  });

  it('6. README.md deve ser específico do OperaBeauty e não conter template padrão do Vite', () => {
    const readmePath = path.join(rootDir, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toContain('# OperaBeauty — SaaS Multi-Tenant');
    expect(content).toContain('docker compose up -d');
    expect(content).toContain('npm run migrate:status');
    expect(content).not.toContain('This template provides a minimal setup to get React working in Vite');
  });

  it('7. Não deve conter pacotes binários compactados (.zip, .tar.gz) rastreados', () => {
    const rootFiles = fs.readdirSync(rootDir);
    const archives = rootFiles.filter(f => /\.(zip|tar\.gz|rar|7z)$/i.test(f));
    expect(archives).toEqual([]);
  });
});
