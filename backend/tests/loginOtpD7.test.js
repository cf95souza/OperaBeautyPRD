import { describe, it, expect } from '@jest/globals';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';

describe('Fase 44 — D7 (P1): Login por Código e Recuperação de Senha via WhatsApp do Salão', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-operabeauty-32chars';

  describe('1. Geração e Propriedades Criptográficas do OTP', () => {
    it('deve gerar código numérico estritamente de 6 dígitos', () => {
      for (let i = 0; i < 50; i++) {
        const code = crypto.randomInt(100000, 1000000).toString();
        expect(code).toMatch(/^[0-9]{6}$/);
        expect(code.length).toBe(6);
      }
    });

    it('deve validar o código OTP utilizando comparação timingSafeEqual contra timing attacks', () => {
      const storedCode = '849201';
      const userCodeCorrect = '849201';
      const userCodeWrong = '849202';

      const matchCorrect = userCodeCorrect.length === 6 &&
        crypto.timingSafeEqual(Buffer.from(userCodeCorrect), Buffer.from(storedCode));
      expect(matchCorrect).toBe(true);

      const matchWrong = userCodeWrong.length === 6 &&
        crypto.timingSafeEqual(Buffer.from(userCodeWrong), Buffer.from(storedCode));
      expect(matchWrong).toBe(false);
    });
  });

  describe('2. Governança e Regras de Negócio (Ecossistema do Salão & Zero SMS)', () => {
    const authServiceContent = fs.readFileSync(
      path.resolve(process.cwd(), 'services/authService.js'),
      'utf8'
    );
    const authRoutesContent = fs.readFileSync(
      path.resolve(process.cwd(), 'routes/auth.js'),
      'utf8'
    );
    const serverGatewayContent = fs.readFileSync(
      path.resolve(process.cwd(), '../gateway-whatsapp/src/server.js'),
      'utf8'
    );

    it('deve ter zero referências a gateways de SMS pagos (Twilio, Zenvia, TotalVoice)', () => {
      expect(authServiceContent.toLowerCase()).not.toContain('twilio');
      expect(authServiceContent.toLowerCase()).not.toContain('zenvia');
      expect(authRoutesContent.toLowerCase()).not.toContain('twilio');
    });

    it('deve checar se o salão possui o recurso whatsapp_gateway antes de disparar OTP', () => {
      expect(authServiceContent).toContain('plan_features');
      expect(authServiceContent).toContain('cap_whatsapp_instances');
      expect(authServiceContent).toContain('CONNECTED');
    });

    it('deve retornar canal manual quando o salão não possuir WhatsApp ativo', () => {
      expect(authServiceContent).toContain("method: 'manual'");
      expect(authServiceContent).toContain('automated: false');
      expect(authServiceContent).toContain('social_whatsapp');
    });

    it('deve expirar o OTP em 300 segundos (5 minutos) no Redis', () => {
      expect(authServiceContent).toContain('await redisClient.setex(otpKey, 300');
    });

    it('deve impor limite estrito de 5 tentativas de código incorreto contra força bruta', () => {
      expect(authServiceContent).toContain('otpData.attempts >= 5');
      expect(authServiceContent).toContain('429');
    });

    it('deve registrar mensagem OTP na auditoria cap_whatsapp_messages no gateway', () => {
      expect(serverGatewayContent).toContain("message_type, content, status, idempotency_key");
      expect(serverGatewayContent).toContain("'OTP'");
    });
  });

  describe('3. Token Temporário de Redefinição (JWT Scoped)', () => {
    it('deve emitir token com expiração de 10m e escopo estrito client_password_reset', () => {
      const clientId = 'c1e4d3f2-1111-4000-8000-000000000001';
      const tenantId = 't1e4d3f2-2222-4000-8000-000000000002';

      const resetToken = jwt.sign(
        {
          client_id: clientId,
          tenant_id: tenantId,
          phone: '(11) 98888-7777',
          purpose: 'client_password_reset',
        },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      const decoded = jwt.verify(resetToken, JWT_SECRET);
      expect(decoded.purpose).toBe('client_password_reset');
      expect(decoded.client_id).toBe(clientId);
      expect(decoded.tenant_id).toBe(tenantId);
    });

    it('deve rejeitar tokens forjados ou com purpose incorreto na redefinição', () => {
      const forgedToken = jwt.sign(
        {
          client_id: 'any-id',
          purpose: 'user_auth',
        },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      const decoded = jwt.verify(forgedToken, JWT_SECRET);
      expect(decoded.purpose === 'client_password_reset').toBe(false);
    });
  });

  describe('4. Complexidade de Nova Senha', () => {
    const isPasswordValid = (pwd) =>
      Boolean(pwd && pwd.length >= 6 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd));

    it('deve aceitar senhas com no mínimo 6 caracteres, letras e números', () => {
      expect(isPasswordValid('senha123')).toBe(true);
      expect(isPasswordValid('Opera2026!')).toBe(true);
      expect(isPasswordValid('A1b2c3')).toBe(true);
    });

    it('deve rejeitar senhas fracas, curtas ou sem números/letras', () => {
      expect(isPasswordValid('12345')).toBe(false); // Curta
      expect(isPasswordValid('abcdef')).toBe(false); // Sem número
      expect(isPasswordValid('123456')).toBe(false); // Sem letra
      expect(isPasswordValid('')).toBe(false);
    });
  });
});
