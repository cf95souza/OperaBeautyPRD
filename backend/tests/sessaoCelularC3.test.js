import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C3 (P0) — Sessão do Celular Estável (Tolerância a Transição Wi-Fi / 4G e Proteção por Device ID)', () => {
  const authServicePath = path.join(rootDir, 'backend/services/authService.js');
  const authRoutesPath = path.join(rootDir, 'backend/routes/auth.js');
  const apiFrontendPath = path.join(rootDir, 'src/lib/api.js');
  const migrationPath = path.join(rootDir, 'migrations/phase13_stable_mobile_session.sql');
  const databaseDocPath = path.join(rootDir, 'database.md');
  const initSqlPath = path.join(rootDir, 'init.sql');

  test('Todos os arquivos de migração, serviços, rotas e cliente frontend devem existir', () => {
    expect(fs.existsSync(authServicePath)).toBe(true);
    expect(fs.existsSync(authRoutesPath)).toBe(true);
    expect(fs.existsSync(apiFrontendPath)).toBe(true);
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(databaseDocPath)).toBe(true);
    expect(fs.existsSync(initSqlPath)).toBe(true);
  });

  describe('Banco de Dados e Migração (DDL)', () => {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const databaseDoc = fs.readFileSync(databaseDocPath, 'utf8');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    test('Deve adicionar a coluna device_id na tabela cap_refresh_tokens', () => {
      const colRegex = /device_id\s+TEXT/i;
      expect(migrationContent).toMatch(colRegex);
      expect(databaseDoc).toMatch(colRegex);
      expect(initSql).toMatch(colRegex);
    });

    test('Deve criar índice para busca rápida por device_id', () => {
      const idxRegex = /idx_cap_refresh_tokens_device/i;
      expect(migrationContent).toMatch(idxRegex);
      expect(databaseDoc).toMatch(idxRegex);
      expect(initSql).toMatch(idxRegex);
    });
  });

  describe('Frontend (src/lib/api.js)', () => {
    const frontContent = fs.readFileSync(apiFrontendPath, 'utf8');

    test('Deve exportar função getDeviceId com persistência em localStorage', () => {
      expect(frontContent).toMatch(/export\s+(const|function)\s+getDeviceId/);
      expect(frontContent).toMatch(/operabeauty_device_id/);
      expect(frontContent).toMatch(/localStorage/);
    });

    test('Deve anexar header x-device-id nas requisições HTTP automáticas', () => {
      expect(frontContent).toMatch(/'x-device-id':\s*getDeviceId\(\)/);
    });

    test('Deve enviar x-device-id na chamada de refresh token', () => {
      expect(frontContent).toMatch(/\/auth\/refresh-token/);
      expect(frontContent).toMatch(/'x-device-id':\s*getDeviceId\(\)/);
    });
  });

  describe('Backend Services (backend/services/authService.js)', () => {
    const serviceContent = fs.readFileSync(authServicePath, 'utf8');

    test('generateAuthData deve aceitar deviceId e persistir no banco', () => {
      expect(serviceContent).toMatch(/generateAuthData\s*=\s*async\s*\([^\)]*deviceId/);
      expect(serviceContent).toMatch(/INSERT INTO public\.cap_refresh_tokens\s*\([^)]*device_id/);
    });

    test('refreshTokenService deve aceitar deviceId e carregar coluna device_id do banco', () => {
      expect(serviceContent).toMatch(/refreshTokenService\s*=\s*async\s*\([^)]*deviceId/);
      expect(serviceContent).toMatch(/SELECT\s+[^;]*device_id\s+FROM public\.cap_refresh_tokens/);
    });

    test('refreshTokenService NÃO deve derrubar a sessão na transição de rede móvel (IP diferente)', () => {
      // Certifica que não existe DELETE/rejeição associando ip_address !== reqIp
      expect(serviceContent).not.toMatch(/if\s*\([^)]*tokenData\.ip_address\s*!==\s*reqIp[^)]*\)\s*\{[^}]*DELETE/);
      expect(serviceContent).toMatch(/Audit Session C3/);
    });

    test('refreshTokenService deve bloquear com 401 se houver divergência explícita de device_id', () => {
      expect(serviceContent).toMatch(/tokenData\.device_id\s*&&\s*reqDeviceId\s*&&\s*tokenData\.device_id\s*!==\s*reqDeviceId/);
      expect(serviceContent).toMatch(/DELETE FROM public\.cap_refresh_tokens WHERE family_id = \$1/);
    });

    test('refreshTokenService deve retornar deviceId no payload para rotação contínua', () => {
      expect(serviceContent).toMatch(/payload\.deviceId\s*=\s*reqDeviceId\s*\|\|\s*tokenData\.device_id/);
    });
  });

  describe('Backend Routes (backend/routes/auth.js)', () => {
    const routesContent = fs.readFileSync(authRoutesPath, 'utf8');

    test('Deve extrair deviceId de header x-device-id ou cookie', () => {
      expect(routesContent).toMatch(/req\.headers\['x-device-id'\]/);
      expect(routesContent).toMatch(/req\.cookies\?\.device_id/);
    });

    test('setAuthCookies deve configurar cookie device_id persistente de longa duração', () => {
      expect(routesContent).toMatch(/res\.cookie\('device_id'/);
      expect(routesContent).toMatch(/365\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    });

    test('Rotas de login e registro devem passar deviceId para generateAuthData', () => {
      expect(routesContent).toMatch(/generateAuthData\(payload,\s*req\.ip,\s*req\.headers\['user-agent'\],\s*null,\s*deviceId\)/);
    });

    test('Rota refresh-token deve passar deviceId para refreshTokenService e para o novo generateAuthData', () => {
      expect(routesContent).toMatch(/refreshTokenService\(refreshToken,\s*req\.ip,\s*req\.headers\['user-agent'\],\s*deviceId\)/);
      expect(routesContent).toMatch(/generateAuthData\(payload,\s*req\.ip,\s*req\.headers\['user-agent'\],\s*payload\.familyId,\s*payload\.deviceId\)/);
    });
  });
});
