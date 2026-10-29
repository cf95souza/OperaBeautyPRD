import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C1 (P0) — Automação de Backup e Disaster Recovery do PostgreSQL', () => {
  const backupScriptPath = path.join(rootDir, 'scripts/backup.sh');
  const restoreScriptPath = path.join(rootDir, 'scripts/restore.sh');
  const backupDocPath = path.join(rootDir, 'docs/backup.md');

  test('Os scripts e a documentação obrigatória de backup devem existir', () => {
    expect(fs.existsSync(backupScriptPath)).toBe(true);
    expect(fs.existsSync(restoreScriptPath)).toBe(true);
    expect(fs.existsSync(backupDocPath)).toBe(true);
  });

  describe('Script de Backup (scripts/backup.sh)', () => {
    const backupContent = fs.readFileSync(backupScriptPath, 'utf8');

    test('Deve utilizar pg_dump no formato customizado (-Fc) para performance e integridade', () => {
      expect(backupContent).toMatch(/pg_dump/);
      expect(backupContent).toMatch(/-Fc/);
    });

    test('Deve realizar backup do volume de uploads (fotos, CRM e comprovantes)', () => {
      expect(backupContent).toMatch(/uploads/i);
      expect(backupContent).toMatch(/tar czf/);
    });

    test('Deve cifrar os arquivos com OpenSSL AES-256-CBC com PBKDF2', () => {
      expect(backupContent).toMatch(/openssl enc -aes-256-cbc/);
      expect(backupContent).toMatch(/-pbkdf2/);
    });

    test('Deve implementar a política de retenção 7/4/6 (diário, semanal e mensal)', () => {
      expect(backupContent).toMatch(/daily/i);
      expect(backupContent).toMatch(/weekly/i);
      expect(backupContent).toMatch(/monthly/i);
      expect(backupContent).toMatch(/-mtime \+7/);
      expect(backupContent).toMatch(/-mtime \+28/);
      expect(backupContent).toMatch(/-mtime \+180/);
    });

    test('Deve conter mecanismo de webhook para envio de alertas em caso de erro', () => {
      expect(backupContent).toMatch(/DISCORD_WEBHOOK_URL/);
      expect(backupContent).toMatch(/TELEGRAM_WEBHOOK_URL/);
      expect(backupContent).toMatch(/curl .*WEBHOOK_URL/);
    });
  });

  describe('Script de Restauração (scripts/restore.sh)', () => {
    const restoreContent = fs.readFileSync(restoreScriptPath, 'utf8');

    test('Deve conter rotina de descriptografia com OpenSSL e suporte a --verify-only', () => {
      expect(restoreContent).toMatch(/openssl enc -d -aes-256-cbc/);
      expect(restoreContent).toMatch(/--verify-only/);
    });

    test('Deve validar a assinatura de cabeçalho PGDMP antes da restauração', () => {
      expect(restoreContent).toMatch(/PGDMP/);
    });

    test('Deve invocar pg_restore para restauração controlada no container', () => {
      expect(restoreContent).toMatch(/pg_restore/);
    });

    test('Deve restaurar o volume de uploads', () => {
      expect(restoreContent).toMatch(/tar xzf/);
    });
  });

  describe('Documentação de Backup (docs/backup.md)', () => {
    const docContent = fs.readFileSync(backupDocPath, 'utf8');

    test('Deve detalhar arquitetura, retenção 7/4/6 e crontab', () => {
      expect(docContent).toMatch(/pg_dump -Fc/);
      expect(docContent).toMatch(/7\/4\/6/);
      expect(docContent).toMatch(/crontab/);
      expect(docContent).toMatch(/Disaster Recovery/i);
    });

    test('Deve conter instruções para modo de verificação sem escrita (--verify-only)', () => {
      expect(docContent).toMatch(/--verify-only/);
    });
  });
});
