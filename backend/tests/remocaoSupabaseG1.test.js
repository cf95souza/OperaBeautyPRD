import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

/**
 * Suíte de Testes Automatizados — Item G1 (P2) — Remoção do Adaptador Supabase e Higiene de Arquitetura
 * Garantindo arquitetura nativa com PostgreSQL dedicado, Express REST API e zero dependências de Supabase
 */

describe('Fase 46 — Item G1: Remoção Definitiva do Adaptador Supabase & Higiene de Arquitetura', () => {

  describe('1. Inexistência do Adaptador e Dependências SDK', () => {
    it('o arquivo legado src/lib/supabase.js não deve existir no repositório', () => {
      const supabaseFilePath = path.join(rootDir, 'src/lib/supabase.js');
      expect(fs.existsSync(supabaseFilePath)).toBe(false);
    });

    it('package.json raiz não deve conter @supabase/supabase-js nas dependências', () => {
      const pkgPath = path.join(rootDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      expect(allDeps['@supabase/supabase-js']).toBeUndefined();
      expect(allDeps['supabase']).toBeUndefined();
    });

    it('backend/package.json não deve conter @supabase/supabase-js nas dependências', () => {
      const pkgPath = path.join(rootDir, 'backend/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      expect(allDeps['@supabase/supabase-js']).toBeUndefined();
      expect(allDeps['supabase']).toBeUndefined();
    });
  });

  describe('2. Varredura Estática em src/ e backend/', () => {
    const scanDirForPattern = (dir, pattern, extFilter = ['.js', '.jsx', '.ts', '.tsx']) => {
      const matches = [];
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory() && file.name !== 'node_modules' && file.name !== 'dist') {
          matches.push(...scanDirForPattern(fullPath, pattern, extFilter));
        } else if (file.isFile() && extFilter.includes(path.extname(file.name))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (pattern.test(content)) {
            matches.push(fullPath);
          }
        }
      }
      return matches;
    };

    it('nenhum arquivo em src/ deve importar de supabase ou de ./supabase', () => {
      const srcDir = path.join(rootDir, 'src');
      const regexImport = /import\s+.*from\s+['"][^'"]*supabase[^'"]*['"]/i;
      const found = scanDirForPattern(srcDir, regexImport);
      expect(found).toEqual([]);
    });

    it('nenhum arquivo em src/ deve conter referências em código à palavra supabase', () => {
      const srcDir = path.join(rootDir, 'src');
      const regexWord = /\bsupabase\b/i;
      const found = scanDirForPattern(srcDir, regexWord);
      expect(found).toEqual([]);
    });

    it('nenhum arquivo de código em backend/ deve conter referências à palavra supabase', () => {
      const backendDir = path.join(rootDir, 'backend');
      const regexWord = /\bsupabase\b/i;
      // Varre o backend ignorando a própria pasta tests
      const files = fs.readdirSync(backendDir, { withFileTypes: true });
      const matches = [];
      for (const item of files) {
        if (item.name === 'tests' || item.name === 'node_modules' || item.name === 'logs' || item.name === 'uploads' || item.name === 'private_uploads') continue;
        const fullPath = path.join(backendDir, item.name);
        if (item.isDirectory()) {
          matches.push(...scanDirForPattern(fullPath, regexWord));
        } else if (item.isFile() && ['.js', '.mjs'].includes(path.extname(item.name))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (regexWord.test(content)) matches.push(fullPath);
        }
      }
      expect(matches).toEqual([]);
    });
  });

  describe('3. Variáveis de Ambiente e Configuração (.env.example)', () => {
    it('.env.example não deve exigir credenciais legadas de Supabase', () => {
      const envExamplePath = path.join(rootDir, '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf8');
      expect(content).not.toContain('SUPABASE_URL');
      expect(content).not.toContain('SUPABASE_ANON_KEY');
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(content).toContain('DB_HOST');
      expect(content).toContain('DB_NAME');
      expect(content).toContain('REDIS_URL');
    });
  });

  describe('4. Arquitetura de Consumo REST Unificada (api.js)', () => {
    it('src/lib/api.js deve ser o cliente canônico unificado exportando api', () => {
      const apiPath = path.join(rootDir, 'src/lib/api.js');
      expect(fs.existsSync(apiPath)).toBe(true);
      const content = fs.readFileSync(apiPath, 'utf8');
      expect(content).toContain('export const api =');
      expect(content).toContain('auth:');
      expect(content).toContain('tenants:');
      expect(content).toContain('services:');
      expect(content).toContain('appointments:');
      expect(content).toContain('invoices:');
      expect(content).toContain('addons:');
    });

    it('chamadas HTTP devem injetar automaticamente Authorization Bearer e x-device-id', () => {
      const apiPath = path.join(rootDir, 'src/lib/api.js');
      const content = fs.readFileSync(apiPath, 'utf8');
      expect(content).toContain('Authorization');
      expect(content).toContain('x-device-id');
    });
  });

});
