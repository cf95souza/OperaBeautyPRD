import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import webpush from 'web-push';
import pool from '../config/db.js';
import pino from 'pino';

const logger = pino();

export const notificationWorker = new Worker('notifications', async (job) => {
  const { action, payload } = job.data;

  if (action === 'sendPush') {
    const { endpoint, keys, notificationPayload } = payload;

    const pushSubscription = {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload);
      logger.info(`Push notification enviada para ${endpoint}`);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // A assinatura expirou ou o usuário revogou a permissão no browser. Remove do banco.
        logger.info(`Removendo assinatura inválida: ${endpoint}`);
        await pool.query('DELETE FROM public.cap_push_subscriptions WHERE endpoint = $1', [endpoint]);
        // Job finalizado com sucesso (não precisa tentar de novo, o cliente não quer mais notificação)
        return;
      }

      logger.error(`Falha ao enviar push notification para ${endpoint}: ${err.message}`);
      // Propaga o erro para o BullMQ acionar o mecanismo de retentativa (retry/backoff)
      throw err;
    }
  }

  if (action === 'sendAppointmentReminder') {
    const { appointmentId, reminderType, tenantId, clientId } = job.data;

    // 1. Validar se o agendamento ainda está ativo (respeitar cancelamento ou conclusão prévia)
    const apptRes = await pool.query(
      `SELECT a.id, a.start_time, a.status, s.name as service_name, t.name as tenant_name, t.slug as tenant_slug, 
              c.name as client_name, c.phone as client_phone,
              st.name as staff_name
       FROM public.cap_appointments a
       JOIN public.cap_services s ON a.service_id = s.id
       JOIN public.cap_tenants t ON a.tenant_id = t.id
       JOIN public.cap_clients c ON a.client_id = c.id
       LEFT JOIN public.cap_staff st ON a.staff_id = st.id
       WHERE a.id = $1 AND a.status NOT IN ('cancelled', 'completed')`,
      [appointmentId]
    );

    if (apptRes.rows.length === 0) {
      logger.info(`Lembrete ${reminderType} para agendamento ${appointmentId} ignorado (agendamento cancelado, concluído ou inexistente).`);
      return;
    }

    const appt = apptRes.rows[0];
    const clientFirstName = (appt.client_name || 'Cliente').split(' ')[0];
    const startTimeDate = new Date(appt.start_time);
    const formattedTime = startTimeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const formattedDate = startTimeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });

    let title = '';
    let body = '';
    if (reminderType === '24h') {
      title = 'Lembrete do seu agendamento ⏰';
      body = `Olá, ${clientFirstName}! Seu atendimento de ${appt.service_name} no ${appt.tenant_name} é amanhã (${formattedDate}) às ${formattedTime}.`;
    } else {
      title = 'Seu atendimento é daqui a pouco! 🌸';
      body = `Olá, ${clientFirstName}! Faltam 2 horas para o seu atendimento de ${appt.service_name} às ${formattedTime} no ${appt.tenant_name}. Estamos te esperando!`;
    }

    const actionUrl = `/${appt.tenant_slug}/historico`;

    // 1. Disparo de Web Push (isolado para não bloquear o WhatsApp)
    try {
      const { notifyClient } = await import('../services/notificationService.js');
      await notifyClient(tenantId, clientId, title, body, actionUrl);
      logger.info(`Lembrete Web Push ${reminderType} disparado com sucesso para cliente ${clientId} (Agendamento ${appointmentId})`);
    } catch (pushErr) {
      logger.warn(`Falha não fatal no Web Push para cliente ${clientId}: ${pushErr.message}`);
    }

    // 2. Disparo de WhatsApp se o salão possuir instância conectada e cliente tiver telefone
    try {
      if (appt.client_phone) {
        let isConnected = false;
        const waInstanceRes = await pool.query(
          `SELECT i.status 
           FROM public.cap_whatsapp_instances i
           WHERE i.tenant_id = $1 AND i.status = 'CONNECTED'`,
          [tenantId]
        );

        if (waInstanceRes.rows.length > 0) {
          isConnected = true;
        } else {
          const { whatsappService } = await import('../services/whatsappService.js');
          const liveStatus = await whatsappService.getInstanceStatus(tenantId);
          if (liveStatus && liveStatus.status === 'CONNECTED') {
            isConnected = true;
            const phone = liveStatus.phone_number || liveStatus.phoneNumber;
            await pool.query(
              `INSERT INTO public.cap_whatsapp_instances (tenant_id, status, phone_number, connected_at, last_activity_at, updated_at)
               VALUES ($1, 'CONNECTED', $2, NOW(), NOW(), NOW())
               ON CONFLICT (tenant_id) DO UPDATE 
               SET status = 'CONNECTED', phone_number = COALESCE(EXCLUDED.phone_number, cap_whatsapp_instances.phone_number),
                   connected_at = COALESCE(cap_whatsapp_instances.connected_at, NOW()), last_activity_at = NOW(), updated_at = NOW()`,
              [tenantId, phone]
            ).catch(() => {});
          }
        }

        if (isConnected) {
          const { whatsappService } = await import('../services/whatsappService.js');
          await whatsappService.sendReminder({
            tenantId,
            appointmentId,
            recipientPhone: appt.client_phone,
            clientName: clientFirstName,
            salonName: appt.tenant_name,
            serviceName: appt.service_name,
            professionalName: appt.staff_name || 'Profissional',
            scheduledTimeFormatted: `${formattedDate} às ${formattedTime}`,
            messageType: reminderType === '24h' ? 'REMINDER_24H' : 'REMINDER_2H',
          });
          logger.info(`Lembrete WhatsApp ${reminderType} enviado com sucesso para ${appt.client_phone} (Agendamento ${appointmentId})`);
        }
      }
    } catch (waErr) {
      logger.warn(`Falha não fatal ao enviar lembrete via WhatsApp para agendamento ${appointmentId}: ${waErr.message}`);
    }
  }

  // Tratamento de expiração de sinal por PIX no agendamento (Liberação de Horário na Agenda)
  if (action === 'checkDepositExpiration') {
    const { appointmentId, tenantId } = job.data;
    try {
      const res = await pool.query(
        `SELECT id, status, deposit_status, client_id, start_time 
         FROM public.cap_appointments 
         WHERE id = $1 AND deposit_status = 'pending'`,
        [appointmentId]
      );

      if (res.rows.length > 0) {
        const appt = res.rows[0];
        await pool.query(
          `UPDATE public.cap_appointments 
           SET status = 'cancelled', deposit_status = 'expired' 
           WHERE id = $1 AND deposit_status = 'pending'`,
          [appointmentId]
        );

        await pool.query(
          `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content)
           VALUES ($1, $2, $3, 'Agendamento cancelado automaticamente: prazo de pagamento do sinal por PIX expirou.')`,
          [tenantId, appt.client_id, appointmentId]
        );

        logger.info(`Sinal por PIX expirado para o agendamento ${appointmentId}. Horário liberado na agenda do profissional.`);
      }
    } catch (expErr) {
      logger.error(`Erro ao processar expiração de sinal para agendamento ${appointmentId}: ${expErr.message}`);
    }
  }
}, {
  connection: redisClient,
  concurrency: 5 // Processar até 5 pushes simultaneamente
});

notificationWorker.on('completed', (job) => {
  logger.debug(`Job ${job.id} concluído com sucesso`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} falhou: ${err.message}`);
});
