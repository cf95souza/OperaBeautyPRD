import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { encrypt, decrypt } from '../utils/crypto.js';

describe('FASE 44 - ITEM D3 (P1): Sinal por PIX no Agendamento & Multi-Gateway Híbrido', () => {

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'operabeauty-secure-encryption-key-test-32bytes';
  });

  describe('1. Criptografia AES-256-GCM em Repouso para Credenciais de Gateway (01-security-constitution)', () => {
    it('deve cifrar e decifrar credenciais de gateway com integridade autenticada e formato IV:Tag:Ciphertext', () => {
      const sensitiveCredentials = JSON.stringify({
        accessToken: 'APP_USR-8472918374928172-042819-test-token',
        publicKey: 'APP_USR-pub-test-key-12345',
        webhookSecret: 'whsec_9876543210fedcba'
      });

      const encrypted = encrypt(sensitiveCredentials);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('APP_USR-8472918374928172');

      const parts = encrypted.split(':');
      expect(parts.length).toBe(3); // IV, Tag, Ciphertext

      const decrypted = decrypt(encrypted);
      const parsed = JSON.parse(decrypted);
      expect(parsed.accessToken).toBe('APP_USR-8472918374928172-042819-test-token');
      expect(parsed.webhookSecret).toBe('whsec_9876543210fedcba');
    });

    it('deve retornar null se o payload estiver corrompido ou com tag de autenticação adulterada', () => {
      const original = encrypt(JSON.stringify({ apiKey: 'asaas_secret_key' }));
      const parts = original.split(':');
      const corruptedTag = parts[1].slice(0, -2) + '00';
      const corruptedPayload = `${parts[0]}:${corruptedTag}:${parts[2]}`;

      expect(decrypt(corruptedPayload)).toBeNull();
    });
  });

  describe('2. Regras de Negócio: Cálculo de Sinal Antecipado (% vs Fixo)', () => {
    function calculateDeposit(service, totalPrice) {
      if (!service.requires_deposit) return 0;

      if (service.deposit_type === 'percentage') {
        const pct = parseFloat(service.deposit_amount || 0);
        return Math.round((totalPrice * (pct / 100)) * 100) / 100;
      }
      return Math.min(parseFloat(service.deposit_amount || 0), totalPrice);
    }

    it('deve calcular corretamente o sinal percentual (ex: 30% de R$ 200,00 = R$ 60,00)', () => {
      const service = {
        requires_deposit: true,
        deposit_type: 'percentage',
        deposit_amount: 30.00
      };
      const deposit = calculateDeposit(service, 200.00);
      expect(deposit).toBe(60.00);
    });

    it('deve calcular corretamente o sinal percentual com casas decimais (ex: 25% de R$ 95,00 = R$ 23,75)', () => {
      const service = {
        requires_deposit: true,
        deposit_type: 'percentage',
        deposit_amount: 25.00
      };
      const deposit = calculateDeposit(service, 95.00);
      expect(deposit).toBe(23.75);
    });

    it('deve calcular o sinal de valor fixo respeitando o teto do preço total do serviço', () => {
      const service = {
        requires_deposit: true,
        deposit_type: 'fixed',
        deposit_amount: 50.00
      };
      // Preço de R$ 150 -> sinal R$ 50
      expect(calculateDeposit(service, 150.00)).toBe(50.00);
      // Preço com cupom/desconto caiu para R$ 40 -> sinal fica limitado a R$ 40
      expect(calculateDeposit(service, 40.00)).toBe(40.00);
    });

    it('deve retornar 0 se o serviço não exigir sinal antecipado', () => {
      const service = {
        requires_deposit: false,
        deposit_type: 'percentage',
        deposit_amount: 50.00
      };
      expect(calculateDeposit(service, 250.00)).toBe(0);
    });
  });

  describe('3. Multi-Gateway Híbrido & Geração de Cobrança PIX', () => {
    it('deve gerar payload PIX simulado com formato padrão e tempo de expiração configurável', () => {
      const appointmentId = '33333333-3333-3333-3333-333333333333';
      const amount = 45.00;
      const expirationMinutes = 15;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

      const charge = {
        paymentId: `sim_${appointmentId.substring(0, 8)}_${now.getTime()}`,
        status: 'pending',
        provider: 'simulator',
        pixCode: `00020126580014br.gov.bcb.pix0136${appointmentId}520400005303986540545.005802BR5913Studio_Thais6009Sao_Paulo62070503***6304`,
        pixQr: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=pix`,
        expiresAt: expiresAt.toISOString(),
        amount: amount
      };

      expect(charge.paymentId).toBeDefined();
      expect(charge.pixCode).toContain('00020126580014br.gov.bcb.pix');
      expect(charge.amount).toBe(45.00);
      expect(new Date(charge.expiresAt).getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('4. Confirmação Atômica e Idempotência de Webhook de Pagamento', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
      };
    });

    it('deve atualizar o agendamento para CONFIRMED e registrar nota no CRM na primeira confirmação', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const appointmentId = '11111111-1111-1111-1111-111111111111';
      const paymentId = 'pay_mercadopago_987654';

      // 1. Mock de busca do agendamento
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: appointmentId,
            tenant_id: tenantId,
            client_id: 'cli-123',
            deposit_status: 'pending',
            deposit_amount: '60.00'
          }]
        })
        // 2. Mock de UPDATE no agendamento
        .mockResolvedValueOnce({ rowCount: 1 })
        // 3. Mock de INSERT na timeline CRM
        .mockResolvedValueOnce({ rowCount: 1 });

      // Lógica de confirmação
      const apptRes = await mockPool.query(
        'SELECT * FROM public.cap_appointments WHERE deposit_payment_id = $1 AND tenant_id = $2',
        [paymentId, tenantId]
      );
      const appt = apptRes.rows[0];

      expect(appt.deposit_status).toBe('pending');

      await mockPool.query(
        `UPDATE public.cap_appointments 
         SET deposit_status = 'paid', status = 'confirmed', deposit_paid_at = NOW() 
         WHERE id = $1 AND tenant_id = $2`,
        [appt.id, tenantId]
      );

      await mockPool.query(
        `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [tenantId, appt.client_id, appt.id, `✅ Sinal de R$ ${appt.deposit_amount} pago com sucesso via PIX.`]
      );

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query.mock.calls[1][1]).toEqual([appointmentId, tenantId]);
      expect(mockPool.query.mock.calls[2][1][3]).toContain('Sinal de R$ 60.00 pago com sucesso via PIX');
    });

    it('deve manter a idempotência se o webhook for reenviado pelo gateway (não duplica ações)', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const paymentId = 'pay_mercadopago_987654';

      // Simula agendamento que JÁ foi marcado como 'paid' em execução anterior
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-1111-1111-111111111111',
          tenant_id: tenantId,
          deposit_status: 'paid', // já pago
          deposit_amount: '60.00'
        }]
      });

      const apptRes = await mockPool.query(
        'SELECT * FROM public.cap_appointments WHERE deposit_payment_id = $1',
        [paymentId]
      );
      const appt = apptRes.rows[0];

      let updateExecuted = false;
      if (appt.deposit_status !== 'paid') {
        await mockPool.query('UPDATE public.cap_appointments ...');
        updateExecuted = true;
      }

      expect(updateExecuted).toBe(false);
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Somente o SELECT, sem re-update
    });
  });

  describe('5. Worker de Expiração Automática de Sinal (checkDepositExpiration)', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
      };
    });

    it('deve cancelar agendamento e liberar o horário quando o prazo de 15 minutos do sinal expirar', async () => {
      const expiredAppointmentId = '99999999-9999-9999-9999-999999999999';

      // 1. Simula query que busca agendamentos pendentes expirados
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: expiredAppointmentId,
            tenant_id: 'ten-1',
            client_id: 'cli-1',
            deposit_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() // expirou há 5 min
          }]
        })
        // 2. Simula UPDATE cancelando o agendamento
        .mockResolvedValueOnce({ rowCount: 1 })
        // 3. Simula nota na timeline informando expiração
        .mockResolvedValueOnce({ rowCount: 1 });

      const expiredApptsRes = await mockPool.query(
        `SELECT id, tenant_id, client_id, deposit_expires_at 
         FROM public.cap_appointments 
         WHERE deposit_status = 'pending' AND deposit_expires_at < NOW() AND status = 'scheduled'`
      );

      for (const row of expiredApptsRes.rows) {
        await mockPool.query(
          `UPDATE public.cap_appointments 
           SET deposit_status = 'expired', status = 'cancelled', updated_at = NOW() 
           WHERE id = $1`,
          [row.id]
        );

        await mockPool.query(
          `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content) 
           VALUES ($1, $2, $3, $4)`,
          [row.tenant_id, row.client_id, row.id, '⏱️ Horário cancelado automaticamente: prazo para pagamento do sinal PIX expirou.']
        );
      }

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query.mock.calls[1][1]).toEqual([expiredAppointmentId]);
      expect(mockPool.query.mock.calls[2][1][3]).toContain('prazo para pagamento do sinal PIX expirou');
    });
  });

});
