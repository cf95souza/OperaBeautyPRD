import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

describe('Fase G38 - Estabilidade de Sessão e Prevenção de Desconexões Espúrias (Grace Period & SameSite)', () => {
  const authServicePath = path.join(rootDir, 'backend/services/authService.js');
  const authRoutesPath = path.join(rootDir, 'backend/routes/auth.js');
  const viteConfigPath = path.join(rootDir, 'vite.config.js');
  const migrationPath = path.join(rootDir, 'migrations/phase49_auth_session_stability.sql');

  test('1. Migration Phase49 deve adicionar a coluna revoked_at e índice de família ativo', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.cap_refresh_tokens/i);
    expect(sql).toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+revoked_at\s+TIMESTAMPTZ/i);
    expect(sql).toMatch(/idx_cap_refresh_tokens_family_active/i);
  });

  test('2. generateAuthData deve gerar tokens de longa duração (24h para staff e 7d para clientes) eliminando expiração em 15m', () => {
    const content = fs.readFileSync(authServicePath, 'utf8');
    expect(content).not.toMatch(/expiresIn:\s*'15m'/);
    expect(content).toMatch(/tokenExpiresIn\s*=\s*isClient\s*\?\s*'7d'\s*:\s*'24h'/);
    expect(content).toMatch(/days\s*=\s*30/);
  });

  test('3. refreshTokenService deve implementar Grace Period de 30s contra concorrência e falsos alarmes de reuso', () => {
    const content = fs.readFileSync(authServicePath, 'utf8');
    expect(content).toMatch(/isWithinGrace/);
    expect(content).toMatch(/latestActive/);
    expect(content).toMatch(/ORDER BY created_at DESC LIMIT 1/);
    expect(content).toMatch(/DELETE FROM public\.cap_refresh_tokens WHERE family_id = \$1/);
    expect(content).toMatch(/revoked_at\s*=\s*NOW\(\)/);
  });

  test('4. setAuthCookies deve usar SameSite=Lax e path=/ para compatibilidade total com Safari/iOS e PWAs', () => {
    const content = fs.readFileSync(authRoutesPath, 'utf8');
    expect(content).not.toMatch(/sameSite:\s*isProduction\s*\?\s*'none'/);
    expect(content).toMatch(/sameSite:\s*'lax'/);
    expect(content).toMatch(/path:\s*'\/'/);
  });

  test('5. vite.config.js deve evitar NetworkFirst em modo navigate para não quebrar rotas SPA com no-response', () => {
    const content = fs.readFileSync(viteConfigPath, 'utf8');
    expect(content).toMatch(/navigateFallback:\s*'\/index\.html'/);
    expect(content).not.toMatch(/cacheName:\s*'pages-cache'/);
  });
});
