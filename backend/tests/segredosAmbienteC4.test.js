import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C4 (P0) — Segredos e Ambiente (.gitignore, .env.example, desindexação de zips e dist)', () => {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const envExamplePath = path.join(rootDir, '.env.example');
  const generateSecretsScriptPath = path.join(rootDir, 'scripts/generate-secrets.js');

  test('Arquivos fundamentais (.gitignore, .env.example, generate-secrets.js) devem existir', () => {
    expect(fs.existsSync(gitignorePath)).toBe(true);
    expect(fs.existsSync(envExamplePath)).toBe(true);
    expect(fs.existsSync(generateSecretsScriptPath)).toBe(true);
  });

  describe('Regras do .gitignore', () => {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

    test('Deve ignorar todos os arquivos .env* exceto .env.example', () => {
      expect(gitignoreContent).toMatch(/\.env\*/);
      expect(gitignoreContent).toMatch(/!\.env\.example/);
    });

    test('Deve ignorar pasta dist/ e dist-ssr/', () => {
      expect(gitignoreContent).toMatch(/dist\//);
      expect(gitignoreContent).toMatch(/dist-ssr\//);
    });

    test('Deve ignorar arquivos compactados e backups criptografados (*.zip, *.tar.gz, *.enc)', () => {
      expect(gitignoreContent).toMatch(/\*\.zip/);
      expect(gitignoreContent).toMatch(/\*\.tar\.gz/);
      expect(gitignoreContent).toMatch(/\*\.enc/);
    });
  });

  describe('Limpeza e Desindexação de Arquivos Rasteados no Git', () => {
    test('Nenhum arquivo .zip ou .tar.gz deve estar rastreado no índice do Git', () => {
      const gitFiles = execSync('git ls-files', { cwd: rootDir }).toString('utf8');
      const lines = gitFiles.split('\n').map(l => l.trim()).filter(Boolean);
      
      const zipFiles = lines.filter(f => f.endsWith('.zip') || f.endsWith('.tar.gz'));
      expect(zipFiles).toEqual([]);
    });

    test('O arquivo .env.vm e .env não devem estar rastreados no índice do Git', () => {
      const gitFiles = execSync('git ls-files', { cwd: rootDir }).toString('utf8');
      const lines = gitFiles.split('\n').map(l => l.trim()).filter(Boolean);

      expect(lines).not.toContain('.env');
      expect(lines).not.toContain('.env.vm');
      expect(lines).not.toContain('backend/.env');
    });

    test('Nenhum arquivo compilado dentro de dist/ deve estar rastreado no índice do Git', () => {
      const gitFiles = execSync('git ls-files', { cwd: rootDir }).toString('utf8');
      const lines = gitFiles.split('\n').map(l => l.trim()).filter(Boolean);

      const distFiles = lines.filter(f => f.startsWith('dist/'));
      expect(distFiles).toEqual([]);
    });
  });

  describe('Qualidade e Segurança do .env.example', () => {
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

    test('Deve conter variáveis essenciais do sistema', () => {
      const requiredVars = [
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'BACKUP_ENCRYPTION_KEY',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DOMAIN',
        'ALLOWED_ORIGINS',
        'VAPID_PUBLIC_KEY',
        'VAPID_PRIVATE_KEY'
      ];

      for (const v of requiredVars) {
        expect(envExampleContent).toContain(`${v}=`);
      }
    });

    test('Deve conter instrução de permissão 600 em produção', () => {
      expect(envExampleContent).toMatch(/chmod 600 \.env/);
    });

    test('NÃO deve conter senhas ou segredos reais vazados', () => {
      expect(envExampleContent).not.toContain('senha_vm_local_operabeauty');
      expect(envExampleContent).not.toContain('super_secret_jwt_homologation_key');
    });
  });

  describe('Script Gerador de Segredos Criptográficos (generate-secrets.js)', () => {
    test('Deve executar com sucesso e gerar segredos hexadecimais fortes', () => {
      const output = execSync('node scripts/generate-secrets.js', { cwd: rootDir }).toString('utf8');
      expect(output).toContain('JWT_SECRET=');
      expect(output).toContain('ENCRYPTION_KEY=');
      expect(output).toContain('BACKUP_ENCRYPTION_KEY=');
      expect(output).toContain('DB_PASSWORD=');
      expect(output).toContain('chmod 600 .env');

      // Verifica tamanho das chaves hex geradas (64 caracteres = 256 bits)
      const matchJwt = output.match(/JWT_SECRET=([a-f0-9]{64})/);
      expect(matchJwt).not.toBeNull();
      const matchEnc = output.match(/ENCRYPTION_KEY=([a-f0-9]{64})/);
      expect(matchEnc).not.toBeNull();
    });
  });
});
