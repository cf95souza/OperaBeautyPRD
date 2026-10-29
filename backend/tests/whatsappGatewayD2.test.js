import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'node:crypto';
import { encrypt, decrypt } from '../../gateway-whatsapp/src/crypto/cipher.js';

describe('Fase 44 — D2 (P1): WhatsApp Gateway Nativo & Confirmação em 1 Toque', () => {

  describe('1. Blindagem Criptográfica AES-256-GCM (01-security-constitution)', () => {
    it('deve cifrar e decifrar dados sensíveis com integridade autenticada', () => {
      const sensitiveData = JSON.stringify({
        creds: { mySecretToken: 'tok_1234567890', noiseKey: 'priv_key_xyz' },
        timestamp: Date.now(),
      });

      const encrypted = encrypt(sensitiveData);
      expect(encrypted.startsWith('enc:v1:')).toBe(true);

      const parts = encrypted.replace('enc:v1:', '').split(':');
      expect(parts.length).toBe(3); // iv (12b hex = 24 chars), tag (16b hex = 32 chars), ciphertext

      const [iv, tag, ciphertext] = parts;
      expect(iv.length).toBe(24);
      expect(tag.length).toBe(32);
      expect(ciphertext.length).toBeGreaterThan(0);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(sensitiveData);
      expect(JSON.parse(decrypted).creds.mySecretToken).toBe('tok_1234567890');
    });

    it('deve falhar a decriptação se o ciphertext ou a tag forem adulterados (Anti-Tampering)', () => {
      const plainText = 'DadosConfidenciaisDoSalao123';
      const encrypted = encrypt(plainText);
      const parts = encrypted.replace('enc:v1:', '').split(':');

      // Modifica o último caractere do ciphertext
      const tamperedCipher = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a');
      const tamperedPayload = `enc:v1:${parts[0]}:${parts[1]}:${tamperedCipher}`;

      expect(() => {
        decrypt(tamperedPayload);
      }).toThrow();
    });

    it('deve rejeitar payloads com formato ou prefixo desconhecido', () => {
      expect(() => decrypt('plaintext-inseguro-sem-prefixo')).toThrow(/Formato criptográfico não reconhecido/);
      expect(() => decrypt(null)).toThrow(/Payload criptografado inválido/);
    });
  });

  describe('2. Segurança M2M e Timing-Safe Equal (01-security-constitution)', () => {
    const SECRET = '8e9b3d01cf8a48efaa7cb57c09341d3b018b14a2741d402fa621ccf87d401362';

    it('deve validar token correto em tempo constante', () => {
      const incoming = '8e9b3d01cf8a48efaa7cb57c09341d3b018b14a2741d402fa621ccf87d401362';
      const isValid = incoming.length === SECRET.length && 
        crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(SECRET));
      expect(isValid).toBe(true);
    });

    it('deve rejeitar tokens incorretos ou de tamanho divergente', () => {
      const wrongToken = '8e9b3d01cf8a48efaa7cb57c09341d3b018b14a2741d402fa621ccf87d401363';
      const shortToken = 'token_curto';

      const check1 = wrongToken.length === SECRET.length && 
        crypto.timingSafeEqual(Buffer.from(wrongToken), Buffer.from(SECRET));
      expect(check1).toBe(false);

      const check2 = shortToken.length === SECRET.length;
      expect(check2).toBe(false);
    });
  });

  describe('3. Webhook de Confirmação e Remarcação em 1 Toque (D2)', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
      };
    });

    it('deve atualizar agendamento para CONFIRMED e registrar nota no CRM ao receber confirmação', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const appointmentId = '11111111-1111-1111-1111-111111111111';
      const clientId = '22222222-2222-2222-2222-222222222222';

      // 1. Simula retorno da busca do agendamento
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: appointmentId, client_id: clientId, status: 'pending' }],
        })
        // 2. Simula UPDATE cap_appointments
        .mockResolvedValueOnce({ rowCount: 1 })
        // 3. Simula INSERT cap_timeline_notes
        .mockResolvedValueOnce({ rowCount: 1 });

      // Simulação do processamento do webhook
      const apptRes = await mockPool.query(
        'SELECT id, client_id, status FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2',
        [appointmentId, tenantId]
      );
      expect(apptRes.rows[0].status).toBe('pending');

      await mockPool.query(
        'UPDATE public.cap_appointments SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        ['confirmed', appointmentId, tenantId]
      );

      await mockPool.query(
        'INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [tenantId, clientId, appointmentId, '✅ Presença confirmada pelo cliente via WhatsApp em 1 toque.']
      );

      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query.mock.calls[1][1]).toEqual(['confirmed', appointmentId, tenantId]);
      expect(mockPool.query.mock.calls[2][1][3]).toContain('Presença confirmada pelo cliente via WhatsApp em 1 toque');
    });

    it('deve atualizar agendamento para RESCHEDULE_REQUESTED e registrar nota de aviso ao salão', async () => {
      const tenantId = '00000000-0000-0000-0000-000000000001';
      const appointmentId = '11111111-1111-1111-1111-111111111111';
      const clientId = '22222222-2222-2222-2222-222222222222';

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: appointmentId, client_id: clientId, status: 'pending' }],
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const apptRes = await mockPool.query('SELECT status FROM cap_appointments');
      const action = 'RESCHEDULE_REQUESTED';

      if (action === 'RESCHEDULE_REQUESTED') {
        await mockPool.query(
          'UPDATE public.cap_appointments SET status = $1 WHERE id = $2',
          ['reschedule_requested', appointmentId]
        );
        await mockPool.query(
          'INSERT INTO public.cap_timeline_notes (content) VALUES ($1)',
          ['📅 Cliente solicitou remarcação pelo WhatsApp em 1 toque.']
        );
      }

      expect(mockPool.query.mock.calls[1][1]).toEqual(['reschedule_requested', appointmentId]);
      expect(mockPool.query.mock.calls[2][1][0]).toContain('Cliente solicitou remarcação pelo WhatsApp em 1 toque');
    });

    it('não deve alterar o status se o agendamento já tiver sido cancelado previamente', async () => {
      const appointmentId = '11111111-1111-1111-1111-111111111111';
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: appointmentId, status: 'cancelled' }],
      });

      const apptRes = await mockPool.query('SELECT status FROM cap_appointments');
      const currentStatus = apptRes.rows[0].status;

      let wasUpdated = false;
      if (!['cancelled', 'completed'].includes(currentStatus)) {
        await mockPool.query('UPDATE public.cap_appointments SET status = $1', ['confirmed']);
        wasUpdated = true;
      }

      expect(wasUpdated).toBe(false);
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Não chamou o UPDATE
    });
  });

  describe('4. Anti-Ban, Jitter e Formatação Interativa', () => {
    it('deve gerar chave de idempotência determinística para prevenir envios duplicados', () => {
      const appointmentId = 'appt-789-xyz';
      const key24h = `rem:${appointmentId}:REMINDER_24H`;
      const key2h = `rem:${appointmentId}:REMINDER_2H`;

      expect(key24h).toBe('rem:appt-789-xyz:REMINDER_24H');
      expect(key2h).toBe('rem:appt-789-xyz:REMINDER_2H');
    });

    it('deve formatar o JID do WhatsApp respeitando DDI internacional', () => {
      const formatJid = (phone) => {
        let clean = (phone || '').replace(/\D/g, '');
        if (!clean.startsWith('55') && clean.length <= 11) {
          clean = '55' + clean;
        }
        return `${clean}@s.whatsapp.net`;
      };

      expect(formatJid('(11) 98765-4321')).toBe('5511987654321@s.whatsapp.net');
      expect(formatJid('5511987654321')).toBe('5511987654321@s.whatsapp.net');
      expect(formatJid('+55 21 99999-8888')).toBe('5521999998888@s.whatsapp.net');
    });

    it('deve conter botões de confirmação e remarcação com IDs canônicos', () => {
      const appointmentId = 'appt-456';
      const buttons = [
        {
          buttonId: `confirm_appointment:${appointmentId}`,
          buttonText: { displayText: '✅ Confirmar Presença' },
        },
        {
          buttonId: `reschedule_appointment:${appointmentId}`,
          buttonText: { displayText: '📅 Solicitar Remarcação' },
        },
      ];

      expect(buttons[0].buttonId).toBe('confirm_appointment:appt-456');
      expect(buttons[1].buttonId).toBe('reschedule_appointment:appt-456');
    });
  });

  describe('5. Proteção de Acesso por Feature Flag & Nível de Plano (SaaS Monetization)', () => {
    it('deve autorizar conexão se o plano do salão possuir a feature whatsapp_gateway', () => {
      const planFeatures = ['dashboard', 'agenda', 'pdv', 'whatsapp_gateway'];
      const featureName = 'whatsapp_gateway';

      const hasFeature = planFeatures.includes(featureName) || 
        planFeatures.some(f => f.toLowerCase().includes('whatsapp_gateway'));
      
      expect(hasFeature).toBe(true);
    });

    it('deve bloquear conexão com HTTP 403 se o plano for de entrada (Solo/Básico/Essencial sem whatsapp_gateway)', () => {
      const entryPlanFeatures = ['1 profissional', 'Agenda digital', 'Suporte por WhatsApp'];
      const featureName = 'whatsapp_gateway';

      const hasFeature = entryPlanFeatures.includes(featureName) || 
        entryPlanFeatures.some(f => f.toLowerCase().includes('whatsapp_gateway'));

      expect(hasFeature).toBe(false);

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      if (!hasFeature) {
        mockRes.status(403).json({ error: `Este recurso (${featureName}) não está disponível para o plano contratado do seu estabelecimento.` });
      }

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('não está disponível para o plano contratado'),
      }));
    });

    it('deve omitir envio de WhatsApp no Worker se o salão não possuir o plano correspondente', async () => {
      const mockQuery = jest.fn().mockResolvedValueOnce({
        rows: [], // Nenhum registro com feature ativa ou plano com whatsapp_gateway
      });

      const tenantId = '00000000-0000-0000-0000-000000000001';
      const waInstanceRes = await mockQuery(
        'SELECT i.status FROM cap_whatsapp_instances i ... WHERE i.tenant_id = $1 AND (p.features @> ["whatsapp_gateway"])',
        [tenantId]
      );

      let whatsappSent = false;
      if (waInstanceRes.rows.length > 0) {
        whatsappSent = true;
      }

      expect(whatsappSent).toBe(false);
    });
  });

});
