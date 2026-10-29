import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import { generateRedemptionCode } from '../services/giftcardService.js';
import { 
  checkGiftCardBruteForce, 
  giftCardIpLimiter, 
  recordFailedGiftCardAttempt, 
  resetGiftCardAttempts,
  isGiftCardBlocked,
  clearAllLocalGiftCardAttempts,
  MAX_FAILED_ATTEMPTS,
  BLOCK_DURATION_SECONDS
} from '../middlewares/giftcardSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

describe('C14 (P1) — Códigos de Vale-Presente Criptográficos & Proteção Anti-Força Bruta', () => {
  const giftcardServicePath = path.join(rootDir, 'backend/services/giftcardService.js');
  const giftcardRoutesPath = path.join(rootDir, 'backend/routes/giftcards.js');
  const giftcardSecurityPath = path.join(rootDir, 'backend/middlewares/giftcardSecurity.js');

  beforeEach(async () => {
    clearAllLocalGiftCardAttempts();
    await resetGiftCardAttempts('tenant-c14-test', '192.168.1.100', 'user-staff-1');
    await resetGiftCardAttempts('brute-force-tenant', '::ffff:127.0.0.1', 'client-1');
    await resetGiftCardAttempts('legit-tenant', '::ffff:127.0.0.1', 'client-1');
  });

  test('Arquivos de serviço, rotas e middleware de segurança devem existir', () => {
    expect(fs.existsSync(giftcardServicePath)).toBe(true);
    expect(fs.existsSync(giftcardRoutesPath)).toBe(true);
    expect(fs.existsSync(giftcardSecurityPath)).toBe(true);
  });

  describe('1. Gerador Criptográfico de Códigos de Resgate (≥ 10 caracteres)', () => {
    test('generateRedemptionCode deve gerar códigos no formato VG-XXXX-XXXX-XXXX com 12 caracteres úteis', () => {
      const code = generateRedemptionCode();
      expect(code).toMatch(/^VG-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      
      const cleanChars = code.replace(/^VG-/, '').replace(/-/g, '');
      expect(cleanChars.length).toBe(12);
      expect(cleanChars.length).toBeGreaterThanOrEqual(10);
    });

    test('generateRedemptionCode não deve conter caracteres visivelmente ambíguos (0, O, 1, I)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRedemptionCode();
        expect(code).not.toMatch(/[01OI]/);
      }
    });

    test('Geração contínua de códigos deve ter alta entropia e sem colisões imediatas', () => {
      const generatedCodes = new Set();
      const TOTAL = 200;
      for (let i = 0; i < TOTAL; i++) {
        generatedCodes.add(generateRedemptionCode());
      }
      expect(generatedCodes.size).toBe(TOTAL);
    });
  });

  describe('2. Governança e Análise Estática de Rotas de Giftcard', () => {
    const giftcardRoutes = fs.readFileSync(giftcardRoutesPath, 'utf8');

    test('Rotas /validate/:code e /redeem/:code devem aplicar rate limiter e proteção contra força bruta', () => {
      expect(giftcardRoutes).toMatch(/\/validate\/:code[\s\S]*?giftCardIpLimiter[\s\S]*?checkGiftCardBruteForce/);
      expect(giftcardRoutes).toMatch(/\/redeem\/:code[\s\S]*?giftCardIpLimiter[\s\S]*?checkGiftCardBruteForce/);
    });

    test('Rotas devem invocar recordFailedGiftCardAttempt em caso de código inválido/não encontrado', () => {
      const failMatches = [...giftcardRoutes.matchAll(/recordFailedGiftCardAttempt/g)];
      expect(failMatches.length).toBeGreaterThanOrEqual(2);
    });

    test('Rotas devem invocar resetGiftCardAttempts em caso de sucesso', () => {
      const resetMatches = [...giftcardRoutes.matchAll(/resetGiftCardAttempts/g)];
      expect(resetMatches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Mecanismo de Tentativas Falhas e Bloqueio Temporário (Unitário)', () => {
    const dummyTenant = 'tenant-c14-test';
    const dummyIp = '192.168.1.100';
    const dummyUser = 'user-staff-1';

    test('Tentativas de 1 a 4 devem ser registradas sem acionar bloqueio', async () => {
      for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
        const res = await recordFailedGiftCardAttempt(dummyTenant, dummyIp, dummyUser);
        expect(res.attempts).toBe(i);
        expect(res.isBlocked).toBe(false);
        expect(res.remainingAttempts).toBe(MAX_FAILED_ATTEMPTS - i);
      }

      const blocked = await isGiftCardBlocked(dummyTenant, dummyIp, dummyUser);
      expect(blocked).toBe(false);
    });

    test('5ª tentativa falha deve acionar o bloqueio temporário (15 minutos)', async () => {
      // Registra 4 falhas
      for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
        await recordFailedGiftCardAttempt(dummyTenant, dummyIp, dummyUser);
      }

      // 5ª falha
      const finalAttempt = await recordFailedGiftCardAttempt(dummyTenant, dummyIp, dummyUser);
      expect(finalAttempt.attempts).toBe(MAX_FAILED_ATTEMPTS);
      expect(finalAttempt.isBlocked).toBe(true);
      expect(finalAttempt.remainingAttempts).toBe(0);

      // Status agora é bloqueado
      const blocked = await isGiftCardBlocked(dummyTenant, dummyIp, dummyUser);
      expect(blocked).toBe(true);
    });

    test('resetGiftCardAttempts deve limpar o histórico de falhas e desbloquear o requisitante', async () => {
      // Bloqueia com 5 falhas
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        await recordFailedGiftCardAttempt(dummyTenant, dummyIp, dummyUser);
      }
      expect(await isGiftCardBlocked(dummyTenant, dummyIp, dummyUser)).toBe(true);

      // Reseta
      await resetGiftCardAttempts(dummyTenant, dummyIp, dummyUser);
      expect(await isGiftCardBlocked(dummyTenant, dummyIp, dummyUser)).toBe(false);
    });
  });

  describe('4. Teste de Força Bruta HTTP Integrado com Express Mock', () => {
    let app;
    let attemptsCount = 0;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = {
          tenant_id: req.headers['x-tenant-id'] || 'demo-tenant',
          id: req.headers['x-user-id'] || 'client-1'
        };
        next();
      });

      // Mock simulando a rota GET /api/giftcards/validate/:code
      app.get(
        '/api/giftcards/validate/:code',
        checkGiftCardBruteForce,
        async (req, res) => {
          const { code } = req.params;
          const tenantId = req.user.tenant_id;
          const ip = req.ip;
          const userId = req.user.id;

          // Código válido simulado
          if (code === 'VG-VALID-CODE-1234') {
            await resetGiftCardAttempts(tenantId, ip, userId);
            return res.json({ id: 'gift-1', available_balance: '100.00', status: 'ACTIVE' });
          }

          // Código inválido
          attemptsCount++;
          await recordFailedGiftCardAttempt(tenantId, ip, userId);
          return res.status(404).json({ error: 'Código de Vale-Presente inválido ou não encontrado.' });
        }
      );
    });

    beforeEach(async () => {
      attemptsCount = 0;
      clearAllLocalGiftCardAttempts();
      await resetGiftCardAttempts('brute-force-tenant', '::ffff:127.0.0.1', 'client-1');
      await resetGiftCardAttempts('legit-tenant', '::ffff:127.0.0.1', 'client-1');
    });

    test('Deve bloquear com HTTP 429 Too Many Requests após 5 tentativas inválidas de adivinhação', async () => {
      const testTenant = 'bf-tenant-' + Date.now();
      const headers = { 'x-tenant-id': testTenant };

      // Executa 5 tentativas inválidas
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .get(`/api/giftcards/validate/VG-INVALID-000${i}`)
          .set(headers);
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/inválido/i);
      }

      // 6ª tentativa deve ser SUMARIAMENTE bloqueada com 429
      const blockedRes = await request(app)
        .get('/api/giftcards/validate/VG-ANOTHER-TRY')
        .set(headers);

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toMatch(/bloqueado por 15 minutos/i);
      // Confirma que o handler de validação nem foi executado na 6ª vez
      expect(attemptsCount).toBe(5);
    });

    test('Código válido antes de atingir 5 tentativas deve passar com sucesso e limpar o contador', async () => {
      const testTenant = 'legit-tenant-' + Date.now();
      const headers = { 'x-tenant-id': testTenant };

      // 2 tentativas erradas
      await request(app).get('/api/giftcards/validate/ERR-1').set(headers);
      await request(app).get('/api/giftcards/validate/ERR-2').set(headers);

      // Código correto
      const successRes = await request(app)
        .get('/api/giftcards/validate/VG-VALID-CODE-1234')
        .set(headers);

      expect(successRes.status).toBe(200);
      expect(successRes.body.status).toBe('ACTIVE');

      // O requisitante não deve estar bloqueado
      const blocked = await isGiftCardBlocked(testTenant, '::ffff:127.0.0.1', 'client-1');
      expect(blocked).toBe(false);
    });
  });
});
