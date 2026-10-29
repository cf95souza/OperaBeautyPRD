import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { 
  generateTotpSecret, 
  generateTotp, 
  verifyTotp, 
  generateOtpAuthUri,
  base32ToBuffer,
  bufferToBase32
} from '../utils/totp.js';
import { notifySuperAdminLoginAlert } from '../services/securityAlertService.js';
import {
  loginSuperadmin,
  verifySuperadmin2Fa,
  setupSuperadmin2Fa,
  enableSuperadmin2Fa,
  disableSuperadmin2Fa
} from '../services/authService.js';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-c13-superadmin';
process.env.JWT_SECRET = JWT_SECRET;

describe('C13 (P2) — 2FA TOTP (RFC 6238) e Alertas de Segurança do Super Admin', () => {
  const totpUtilPath = path.join(rootDir, 'backend/utils/totp.js');
  const alertServicePath = path.join(rootDir, 'backend/services/securityAlertService.js');
  const authRoutesPath = path.join(rootDir, 'backend/routes/auth.js');
  const frontendLoginPath = path.join(rootDir, 'src/pages/superadmin/SuperAdminLogin.jsx');

  test('Todos os arquivos de 2FA, rotas, alertas e frontend devem existir', () => {
    expect(fs.existsSync(totpUtilPath)).toBe(true);
    expect(fs.existsSync(alertServicePath)).toBe(true);
    expect(fs.existsSync(authRoutesPath)).toBe(true);
    expect(fs.existsSync(frontendLoginPath)).toBe(true);
  });

  describe('1. Motor Criptográfico TOTP RFC 6238', () => {
    test('generateTotpSecret deve gerar segredo Base32 de 32 caracteres RFC 4648', () => {
      const secret = generateTotpSecret(20);
      expect(typeof secret).toBe('string');
      expect(secret.length).toBe(32);
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    test('bufferToBase32 e base32ToBuffer devem ser bidirecionais e invariantes', () => {
      const originalBuffer = Buffer.from('OperaBeautySec2026', 'utf8');
      const base32 = bufferToBase32(originalBuffer);
      const decodedBuffer = base32ToBuffer(base32);
      expect(decodedBuffer.toString('utf8')).toBe('OperaBeautySec2026');
    });

    test('generateTotp deve gerar código numérico de 6 dígitos formatado', () => {
      const secret = generateTotpSecret();
      const code = generateTotp(secret);
      expect(code).toMatch(/^\d{6}$/);
    });

    test('verifyTotp deve validar com sucesso o código do instante atual', () => {
      const secret = generateTotpSecret();
      const now = Date.now();
      const validCode = generateTotp(secret, now);
      expect(verifyTotp(validCode, secret, 1, now)).toBe(true);
    });

    test('verifyTotp deve aceitar drift de ±1 janela (30s passado e 30s futuro)', () => {
      const secret = generateTotpSecret();
      const now = Date.now();

      // Código de 30 segundos no passado
      const pastCode = generateTotp(secret, now - 30000);
      expect(verifyTotp(pastCode, secret, 1, now)).toBe(true);

      // Código de 30 segundos no futuro
      const futureCode = generateTotp(secret, now + 30000);
      expect(verifyTotp(futureCode, secret, 1, now)).toBe(true);
    });

    test('verifyTotp deve rejeitar drift além da janela tolerada (> 60 segundos)', () => {
      const secret = generateTotpSecret();
      const now = Date.now();
      const oldCode = generateTotp(secret, now - 90000); // 90s atrás
      expect(verifyTotp(oldCode, secret, 1, now)).toBe(false);
    });

    test('verifyTotp deve rejeitar códigos incorretos ou com caracteres não numéricos', () => {
      const secret = generateTotpSecret();
      expect(verifyTotp('000000', secret)).toBe(false);
      expect(verifyTotp('abc123', secret)).toBe(false);
      expect(verifyTotp('', secret)).toBe(false);
      expect(verifyTotp(null, secret)).toBe(false);
    });

    test('generateOtpAuthUri deve montar a URI otpauth:// correta para autenticadores', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const uri = generateOtpAuthUri('admin@operabeauty.com', 'OperaBeauty', secret);
      expect(uri).toContain('otpauth://totp/OperaBeauty:admin%40operabeauty.com');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=OperaBeauty');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });
  });

  describe('2. Serviço de Alertas de Segurança de Login', () => {
    test('notifySuperAdminLoginAlert deve processar sem erro na ausência de webhook (dev mode)', async () => {
      const originalUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
      delete process.env.SECURITY_ALERT_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;

      const result = await notifySuperAdminLoginAlert({
        adminEmail: 'superadmin@operabeauty.com',
        adminName: 'Admin Mestre',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Jest Test',
        isNewDeviceOrIp: true
      });

      expect(result.sent).toBe(false);
      expect(result.reason).toMatch(/nenhum webhook configurado/i);

      if (originalUrl) process.env.SECURITY_ALERT_WEBHOOK_URL = originalUrl;
    });
  });

  describe('3. Governança do Código Frontend e Rotas Backend', () => {
    const authRoutes = fs.readFileSync(authRoutesPath, 'utf8');
    const frontendLogin = fs.readFileSync(frontendLoginPath, 'utf8');

    test('backend/routes/auth.js deve conter a rota POST /login-superadmin/verify-2fa com rate limit', () => {
      expect(authRoutes).toMatch(/\/login-superadmin\/verify-2fa/);
      expect(authRoutes).toMatch(/verify2faLimiter/);
    });

    test('backend/routes/auth.js deve conter rotas de gestão de 2FA (/superadmin/2fa/setup e enable)', () => {
      expect(authRoutes).toMatch(/\/superadmin\/2fa\/setup/);
      expect(authRoutes).toMatch(/\/superadmin\/2fa\/enable/);
      expect(authRoutes).toMatch(/\/superadmin\/2fa\/disable/);
    });

    test('src/pages/superadmin/SuperAdminLogin.jsx deve conter suporte visual a step === "2fa"', () => {
      expect(frontendLogin).toMatch(/step === '2fa'/);
      expect(frontendLogin).toMatch(/handleVerify2Fa/);
      expect(frontendLogin).toMatch(/verifySuperAdmin2Fa/);
    });
  });

  describe('4. Teste de Integração de Fluxo 2FA com Express Mock', () => {
    let app;
    const testSecret = generateTotpSecret();
    const testAdminId = '99999999-8888-7777-6666-555555555555';
    let originalQuery;

    beforeAll(() => {
      originalQuery = pool.query;
      app = express();
      app.use(express.json());

      // Mock da rota POST /auth/login-superadmin
      app.post('/auth/login-superadmin', async (req, res) => {
        const { email, password } = req.body;
        if (password !== 'Correta@123') {
          return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
        }

        // Simula admin com 2FA ativado
        if (email === 'admin-2fa@operabeauty.com') {
          const tempToken = jwt.sign(
            { admin_id: testAdminId, email, purpose: '2fa_login' },
            JWT_SECRET,
            { expiresIn: '5m' }
          );
          return res.json({ require_2fa: true, temp_token: tempToken, email });
        }

        // Admin sem 2FA
        return res.json({ token: 'jwt-direto', user: { id: testAdminId, email, role: 'superadmin' } });
      });

      // Mock da rota POST /auth/login-superadmin/verify-2fa
      app.post('/auth/login-superadmin/verify-2fa', async (req, res) => {
        const { temp_token, code } = req.body;
        let decoded;
        try {
          decoded = jwt.verify(temp_token, JWT_SECRET);
          if (decoded.purpose !== '2fa_login') throw new Error('Token inválido.');
        } catch (e) {
          return res.status(401).json({ error: 'Sessão temporária de 2FA expirada ou inválida. Faça login novamente.' });
        }

        const isValid = verifyTotp(code, testSecret);
        if (!isValid) {
          return res.status(401).json({ error: 'Código de autenticação de dois fatores inválido ou expirado.' });
        }

        return res.json({
          token: 'jwt-final-com-2fa',
          user: { id: decoded.admin_id, email: decoded.email, role: 'superadmin' }
        });
      });
    });

    afterAll(() => {
      pool.query = originalQuery;
    });

    test('Login com credencial errada deve falhar sem chegar ao 2FA', async () => {
      const res = await request(app)
        .post('/auth/login-superadmin')
        .send({ email: 'admin-2fa@operabeauty.com', password: 'Errada' });
      expect(res.status).toBe(401);
      expect(res.body.require_2fa).toBeUndefined();
    });

    test('Login com admin com 2FA ativo deve retornar require_2fa: true e temp_token', async () => {
      const res = await request(app)
        .post('/auth/login-superadmin')
        .send({ email: 'admin-2fa@operabeauty.com', password: 'Correta@123' });

      expect(res.status).toBe(200);
      expect(res.body.require_2fa).toBe(true);
      expect(res.body.temp_token).toBeDefined();
      expect(res.body.token).toBeUndefined(); // Ainda não possui token final
    });

    test('Verificação de 2FA com código incorreto deve ser rejeitada com HTTP 401', async () => {
      // 1. Obtém temp_token
      const loginRes = await request(app)
        .post('/auth/login-superadmin')
        .send({ email: 'admin-2fa@operabeauty.com', password: 'Correta@123' });

      // 2. Tenta código errado
      const verifyRes = await request(app)
        .post('/auth/login-superadmin/verify-2fa')
        .send({ temp_token: loginRes.body.temp_token, code: '000000' });

      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.error).toMatch(/inválido ou expirado/i);
    });

    test('Verificação de 2FA com código TOTP correto deve conceder acesso definitivo', async () => {
      // 1. Obtém temp_token
      const loginRes = await request(app)
        .post('/auth/login-superadmin')
        .send({ email: 'admin-2fa@operabeauty.com', password: 'Correta@123' });

      // 2. Gera código TOTP autêntico
      const correctCode = generateTotp(testSecret);

      // 3. Verifica
      const verifyRes = await request(app)
        .post('/auth/login-superadmin/verify-2fa')
        .send({ temp_token: loginRes.body.temp_token, code: correctCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.token).toBe('jwt-final-com-2fa');
      expect(verifyRes.body.user.role).toBe('superadmin');
    });

    test('Verificação com temp_token adulterado deve ser rejeitada com HTTP 401', async () => {
      const verifyRes = await request(app)
        .post('/auth/login-superadmin/verify-2fa')
        .send({ temp_token: 'token-invalido-forjado', code: '123456' });

      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.error).toMatch(/inválida/i);
    });
  });
});
