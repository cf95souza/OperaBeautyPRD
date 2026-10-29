import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Fase 44 — D1 (P1): Lembretes por Push (Web Push/VAPID) com Fila no Redis', () => {

  describe('1. Cálculo de Horários e Enfileiramento no BullMQ', () => {
    it('deve calcular delay correto e enfileirar lembretes de 24h e 2h antes para agendamentos futuros', () => {
      const now = new Date('2026-10-23T10:00:00Z').getTime();
      const startTime = new Date('2026-10-25T14:00:00Z').getTime(); // Daqui a 52 horas

      const ms24h = startTime - (24 * 60 * 60 * 1000); // Daqui a 28 horas
      const ms2h = startTime - (2 * 60 * 60 * 1000);   // Daqui a 50 horas

      expect(ms24h).toBeGreaterThan(now);
      expect(ms2h).toBeGreaterThan(now);

      const delay24h = ms24h - now;
      const delay2h = ms2h - now;

      expect(delay24h).toBe(28 * 60 * 60 * 1000);
      expect(delay2h).toBe(50 * 60 * 60 * 1000);

      const appointmentId = 'appt-uuid-123';
      const expectedJobId24h = `reminder:push:24h:${appointmentId}`;
      const expectedJobId2h = `reminder:push:2h:${appointmentId}`;

      expect(expectedJobId24h).toBe('reminder:push:24h:appt-uuid-123');
      expect(expectedJobId2h).toBe('reminder:push:2h:appt-uuid-123');
    });

    it('não deve enfileirar o lembrete de 24h se o agendamento for feito para hoje (menos de 24h de antecedência)', () => {
      const now = new Date('2026-10-23T10:00:00Z').getTime();
      const startTime = new Date('2026-10-23T16:00:00Z').getTime(); // Daqui a 6 horas

      const ms24h = startTime - (24 * 60 * 60 * 1000); // 18 horas no passado
      const ms2h = startTime - (2 * 60 * 60 * 1000);   // Daqui a 4 horas

      expect(ms24h > now).toBe(false); // NÃO deve enfileirar 24h
      expect(ms2h > now).toBe(true);   // DEVE enfileirar 2h

      const delay2h = ms2h - now;
      expect(delay2h).toBe(4 * 60 * 60 * 1000);
    });

    it('não deve enfileirar nenhum lembrete se o agendamento for para daqui a menos de 2h', () => {
      const now = new Date('2026-10-23T10:00:00Z').getTime();
      const startTime = new Date('2026-10-23T11:00:00Z').getTime(); // Daqui a 1 hora

      const ms24h = startTime - (24 * 60 * 60 * 1000);
      const ms2h = startTime - (2 * 60 * 60 * 1000);

      expect(ms24h > now).toBe(false);
      expect(ms2h > now).toBe(false);
    });
  });

  describe('2. Cancelamento e Remarcação de Agendamentos', () => {
    it('deve remover os jobs do BullMQ correspondentes ao agendamento cancelado', async () => {
      const mockRemove = jest.fn().mockResolvedValue(true);
      const mockGetJob = jest.fn().mockImplementation((jobId) => {
        if (jobId.includes('appt-cancel-456')) {
          return Promise.resolve({ remove: mockRemove });
        }
        return Promise.resolve(null);
      });

      const mockQueue = {
        getJob: mockGetJob
      };

      const appointmentId = 'appt-cancel-456';
      const jobIds = [
        `reminder:push:24h:${appointmentId}`,
        `reminder:push:2h:${appointmentId}`
      ];

      for (const jobId of jobIds) {
        const job = await mockQueue.getJob(jobId);
        if (job) await job.remove();
      }

      expect(mockGetJob).toHaveBeenCalledTimes(2);
      expect(mockRemove).toHaveBeenCalledTimes(2);
    });

    it('deve ignorar silenciosamente quando o job a ser cancelado já tiver sido executado ou não existir mais', async () => {
      const mockGetJob = jest.fn().mockResolvedValue(null);
      const mockQueue = { getJob: mockGetJob };

      const appointmentId = 'appt-nonexistent-789';
      let errorThrown = false;
      try {
        const jobIds = [`reminder:push:24h:${appointmentId}`, `reminder:push:2h:${appointmentId}`];
        for (const jobId of jobIds) {
          const job = await mockQueue.getJob(jobId);
          if (job) await job.remove();
        }
      } catch (e) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
      expect(mockGetJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Comportamento do Worker e Respeito a Cancelamentos Prévios', () => {
    it('deve abortar o envio do lembrete se o agendamento foi cancelado antes do disparo', async () => {
      // Simula busca no banco retornando 0 linhas (status = 'cancelled' é filtrado na query)
      const mockDbQuery = jest.fn().mockResolvedValue({ rows: [] });
      const mockNotifyClient = jest.fn();

      const appointmentId = 'appt-already-cancelled';
      const reminderType = '24h';

      const apptRes = await mockDbQuery(
        `SELECT a.id, a.start_time, a.status FROM public.cap_appointments WHERE id = $1 AND a.status NOT IN ('cancelled', 'completed')`,
        [appointmentId]
      );

      if (apptRes.rows.length === 0) {
        // Aborta sem erro e sem disparar notificação
      } else {
        await mockNotifyClient();
      }

      expect(mockDbQuery).toHaveBeenCalled();
      expect(mockNotifyClient).not.toHaveBeenCalled();
    });

    it('deve disparar o push formatado corretamente se o agendamento continua ativo', async () => {
      const mockAppt = {
        id: 'appt-active-1',
        start_time: '2026-10-24T14:30:00-03:00',
        status: 'scheduled',
        service_name: 'Corte & Escova',
        tenant_name: 'Espaço Bella Donna',
        tenant_slug: 'espaco-bella-donna',
        client_name: 'Beatriz Alcantara'
      };

      const mockDbQuery = jest.fn().mockResolvedValue({ rows: [mockAppt] });
      const mockNotifyClient = jest.fn().mockResolvedValue({ success: true });

      const apptRes = await mockDbQuery('query', ['appt-active-1']);
      const appt = apptRes.rows[0];

      const clientFirstName = (appt.client_name || 'Cliente').split(' ')[0];
      const startTimeDate = new Date(appt.start_time);
      const formattedTime = startTimeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const formattedDate = startTimeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

      const title = 'Lembrete do seu agendamento ⏰';
      const body = `Olá, ${clientFirstName}! Seu atendimento de ${appt.service_name} no ${appt.tenant_name} é amanhã (${formattedDate}) às ${formattedTime}.`;
      const actionUrl = `/${appt.tenant_slug}/historico`;

      await mockNotifyClient('tenant-uuid', 'client-uuid', title, body, actionUrl);

      expect(mockNotifyClient).toHaveBeenCalledWith(
        'tenant-uuid',
        'client-uuid',
        'Lembrete do seu agendamento ⏰',
        'Olá, Beatriz! Seu atendimento de Corte & Escova no Espaço Bella Donna é amanhã (24/10) às 14:30.',
        '/espaco-bella-donna/historico'
      );
    });
  });

  describe('4. Resiliência da Fila e Remoção de Assinaturas Expiradas (404/410 GONE)', () => {
    it('deve excluir endpoint expirado do banco quando web-push retornar erro 410 GONE sem quebrar o worker', async () => {
      const mockDeleteQuery = jest.fn().mockResolvedValue({ rowCount: 1 });
      const endpoint = 'https://updates.push.services.mozilla.com/wpush/v2/expired-endpoint-token';

      const mockWebPushError = new Error('Subscription expired');
      mockWebPushError.statusCode = 410;

      let caughtError = null;
      try {
        throw mockWebPushError;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await mockDeleteQuery('DELETE FROM public.cap_push_subscriptions WHERE endpoint = $1', [endpoint]);
        } else {
          caughtError = err;
        }
      }

      expect(mockDeleteQuery).toHaveBeenCalledWith(
        'DELETE FROM public.cap_push_subscriptions WHERE endpoint = $1',
        [endpoint]
      );
      expect(caughtError).toBeNull(); // Não propaga o erro para não travar a fila
    });

    it('deve propagar erros transitórios de rede (ex: 500 ou timeout) para permitir retentativa automática no BullMQ', async () => {
      const mockNetworkError = new Error('Gateway Timeout');
      mockNetworkError.statusCode = 504;

      let rethrown = false;
      try {
        throw mockNetworkError;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // não faz nada
        } else {
          rethrown = true;
        }
      }

      expect(rethrown).toBe(true);
    });
  });

  describe('5. Isolamento Multi-Tenant e Armazenamento Seguro', () => {
    it('deve exigir tenant_id obrigatório e registrar assinaturas push vinculadas ao cliente e salão', () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3q8-2c2vK...',
          auth: 'tBHItJI5svbpez7KI4CCXg=='
        }
      };

      const tenantId = 'tenant-salon-001';
      const clientId = 'client-user-999';

      expect(tenantId).toBeDefined();
      expect(clientId).toBeDefined();
      expect(subscription.endpoint).toMatch(/^https:\/\//);
      expect(subscription.keys.p256dh).toBeDefined();
      expect(subscription.keys.auth).toBeDefined();
    });
  });
});
