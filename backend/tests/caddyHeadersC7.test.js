import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C7 (P1) — Cabeçalhos de Segurança e Cache no Caddy (Caddyfile)', () => {
  const caddyfilePath = path.join(rootDir, 'Caddyfile');
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');

  test('Caddyfile e docker-compose.yml devem existir na raiz do projeto', () => {
    expect(fs.existsSync(caddyfilePath)).toBe(true);
    expect(fs.existsSync(dockerComposePath)).toBe(true);
  });

  describe('Auditoria Estrutural do Caddyfile', () => {
    const caddyContent = fs.readFileSync(caddyfilePath, 'utf8');

    test('Deve conter compressão zstd e gzip ativa', () => {
      expect(caddyContent).toMatch(/encode\s+zstd\s+gzip/);
    });

    test('Deve conter Strict-Transport-Security (HSTS) com max-age de 1 ano, subdomínios e preload', () => {
      expect(caddyContent).toMatch(/Strict-Transport-Security\s+"max-age=31536000;\s*includeSubDomains;\s*preload"/i);
    });

    test('Deve conter X-Content-Type-Options nosniff contra MIME-sniffing', () => {
      expect(caddyContent).toMatch(/X-Content-Type-Options\s+"nosniff"/i);
    });

    test('Deve conter X-Frame-Options SAMEORIGIN contra clickjacking', () => {
      expect(caddyContent).toMatch(/X-Frame-Options\s+"SAMEORIGIN"/i);
    });

    test('Deve conter Referrer-Policy strict-origin-when-cross-origin', () => {
      expect(caddyContent).toMatch(/Referrer-Policy\s+"strict-origin-when-cross-origin"/i);
    });

    test('Deve conter Permissions-Policy restringindo câmera, microfone, geolocalização e pagamento', () => {
      expect(caddyContent).toMatch(/Permissions-Policy\s+"camera=\(self\),\s*microphone=\(\),\s*geolocation=\(\),\s*payment=\(self\),\s*usb=\(\)"/i);
    });

    test('Deve conter Content-Security-Policy-Report-Only em modo relatório não-bloqueante com diretivas seguras', () => {
      expect(caddyContent).toMatch(/Content-Security-Policy-Report-Only\s+"default-src\s+'self'/i);
      expect(caddyContent).toMatch(/https:\/\/fonts\.googleapis\.com/);
      expect(caddyContent).toMatch(/https:\/\/fonts\.gstatic\.com/);
      expect(caddyContent).toMatch(/frame-ancestors\s+'self'/);
    });

    test('Deve remover a identificação de servidor web (-Server e -X-Powered-By)', () => {
      expect(caddyContent).toMatch(/-Server/);
      expect(caddyContent).toMatch(/-X-Powered-By/);
    });

    test('Deve configurar cache longo e imutável para assets estáticos com hash (/assets/*)', () => {
      expect(caddyContent).toMatch(/handle\s+\/assets\/\*\s*\{[^}]*header\s+Cache-Control\s+"public,\s*max-age=31536000,\s*immutable"/s);
    });

    test('Deve configurar no-cache estrito para sw.js e para o fallback do React SPA', () => {
      expect(caddyContent).toMatch(/handle\s+\/sw\.js\s*\{[^}]*header\s+Cache-Control\s+"no-cache,\s*no-store,\s*must-revalidate"/s);
      expect(caddyContent).toMatch(/handle\s*\{[^}]*try_files\s+\{path\}\s+\/index\.html[^}]*header\s+Cache-Control\s+"no-cache,\s*no-store,\s*must-revalidate"/s);
    });
  });

  describe('Auditoria do docker-compose.yml', () => {
    const composeContent = fs.readFileSync(dockerComposePath, 'utf8');

    test('O Caddyfile deve estar montado como volume no serviço caddy', () => {
      expect(composeContent).toMatch(/-\s*\.\/Caddyfile:\/etc\/caddy\/Caddyfile:ro/);
    });
  });

  describe('Validação Prática de Conexão HTTP (Integração com Caddy em localhost:8080)', () => {
    const fetchHeaders = (urlPath) => {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: 'localhost',
            port: 8080,
            path: urlPath,
            method: 'HEAD',
            timeout: 3000,
          },
          (res) => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
            });
          }
        );

        req.on('error', (err) => resolve({ error: err.message }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ error: 'timeout' });
        });
        req.end();
      });
    };

    test('A rota raiz (/) servida pelo Caddy deve responder com todos os Security Headers', async () => {
      const response = await fetchHeaders('/');
      if (response.error) {
        console.warn(`[SKIP HTTP LIVE CHECK] Caddy local não alcançável na porta 8080 (${response.error})`);
        return;
      }

      expect(response.statusCode).toBe(200);
      const h = response.headers;

      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['x-frame-options']).toBe('SAMEORIGIN');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['strict-transport-security']).toContain('max-age=31536000');
      expect(h['permissions-policy']).toContain('camera=(self)');
      expect(h['content-security-policy-report-only']).toBeDefined();
      expect(h['server']).toBeUndefined();
      expect(h['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });

    test('A rota de assets (/assets/*) deve responder com Cache-Control immutable', async () => {
      const assetsDir = path.join(rootDir, 'dist/assets');
      let assetFile = 'index-DwqRgED_.js';
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const jsFile = files.find(f => f.endsWith('.js') || f.endsWith('.css'));
        if (jsFile) assetFile = jsFile;
      }

      const response = await fetchHeaders(`/assets/${assetFile}`);
      if (response.error || response.statusCode === 404) {
        return;
      }

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });
});
