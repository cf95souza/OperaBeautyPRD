import webpush from 'web-push';
import pool from '../config/db.js';
import { tenantQuery } from '../utils/tenantQuery.js';
import { notificationQueue } from '../config/queue.js';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:suporte@operabeauty.com.br',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ VAPID Keys não configuradas. Web Push não funcionará.');
}

/**
 * Salva a assinatura de Push de um dispositivo no banco (Staff)
 */
export const subscribeToPush = async (tenantId, staffId, subscription) => {
  const { endpoint, keys } = subscription;
  
  await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_push_subscriptions (tenant_id, staff_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE 
     SET tenant_id = EXCLUDED.tenant_id, staff_id = EXCLUDED.staff_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [tenantId, staffId, endpoint, keys.p256dh, keys.auth]
  );
  
  return { success: true };
};

/**
 * Salva a assinatura de Push de um dispositivo no banco (Cliente)
 */
export const subscribeClientToPush = async (tenantId, clientId, subscription) => {
  const { endpoint, keys } = subscription;
  
  await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_push_subscriptions (tenant_id, client_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE 
     SET tenant_id = EXCLUDED.tenant_id, client_id = EXCLUDED.client_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [tenantId, clientId, endpoint, keys.p256dh, keys.auth]
  );
  
  return { success: true };
};

/**
 * Envia uma notificação (In-App e Push) para um profissional
 */
export const notifyStaff = async (tenantId, staffId, title, body, actionUrl = null) => {
  // 1. Salvar notificação In-App
  await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_notifications (tenant_id, staff_id, title, body)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, staffId, title, body]
  );

  // 2. Buscar todas as assinaturas ativas (celulares/PCs) desse profissional
  const subsResult = await tenantQuery(
    tenantId,
    `SELECT endpoint, p256dh, auth FROM public.cap_push_subscriptions WHERE staff_id = $1 AND tenant_id = $2`,
    [staffId, tenantId]
  );

  const payload = JSON.stringify({
    title,
    body,
    icon: '/pwa-192x192.png',
    url: actionUrl || '/'
  });

  const pushPromises = subsResult.rows.map(async (sub) => {
    // 3. Enfileirar o disparo de Push Notification
    await notificationQueue.add('sendPush', {
      action: 'sendPush',
      payload: {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        },
        notificationPayload: payload
      }
    }, {
      attempts: 3, // Retentativa automática
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }).catch(err => console.error('Erro ao enfileirar push staff:', err));
  });

  await Promise.all(pushPromises);
};

/**
 * Envia uma notificação (In-App e Push) para um cliente
 */
export const notifyClient = async (tenantId, clientId, title, body, actionUrl = null) => {
  // 1. Salvar notificação In-App
  await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_notifications (tenant_id, client_id, title, body)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, clientId, title, body]
  );

  // 2. Buscar assinaturas
  const subsResult = await tenantQuery(
    tenantId,
    `SELECT endpoint, p256dh, auth FROM public.cap_push_subscriptions WHERE client_id = $1 AND tenant_id = $2`,
    [clientId, tenantId]
  );

  const payload = JSON.stringify({
    title,
    body,
    icon: '/pwa-192x192.png',
    url: actionUrl || '/'
  });

  const pushPromises = subsResult.rows.map(async (sub) => {
    // 3. Enfileirar o disparo de Push Notification
    await notificationQueue.add('sendPush', {
      action: 'sendPush',
      payload: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload: payload
      }
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    }).catch(err => console.error('Erro ao enfileirar push client:', err));
  });

  await Promise.all(pushPromises);
};

/**
 * Agendamento automático de Lembretes Push no Redis/BullMQ (24h e 2h antes) — D1 (P1)
 */
export const scheduleAppointmentReminders = async (appointmentId) => {
  if (!appointmentId) return;

  const result = await pool.query(
    `SELECT a.id, a.tenant_id, a.client_id, a.start_time, a.status,
            s.name as service_name, st.name as staff_name, t.name as tenant_name, t.slug as tenant_slug,
            c.name as client_name
     FROM public.cap_appointments a
     JOIN public.cap_services s ON a.service_id = s.id
     JOIN public.cap_staff st ON a.staff_id = st.id
     JOIN public.cap_tenants t ON a.tenant_id = t.id
     JOIN public.cap_clients c ON a.client_id = c.id
     WHERE a.id = $1 AND a.status NOT IN ('cancelled', 'completed')`,
    [appointmentId]
  );

  if (result.rows.length === 0) return;
  const appt = result.rows[0];

  const startTime = new Date(appt.start_time).getTime();
  const now = Date.now();

  const ms24h = startTime - (24 * 60 * 60 * 1000);
  const ms2h = startTime - (2 * 60 * 60 * 1000);

  // Lembrete 24h antes
  if (ms24h > now) {
    const delay24h = ms24h - now;
    await notificationQueue.add(
      'sendAppointmentReminder',
      {
        action: 'sendAppointmentReminder',
        appointmentId: appt.id,
        reminderType: '24h',
        tenantId: appt.tenant_id,
        clientId: appt.client_id
      },
      {
        jobId: `reminder:push:24h:${appt.id}`,
        delay: delay24h,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    ).catch(err => console.error('Falha ao agendar lembrete push 24h:', err));
  }

  // Lembrete 2h antes
  if (ms2h > now) {
    const delay2h = ms2h - now;
    await notificationQueue.add(
      'sendAppointmentReminder',
      {
        action: 'sendAppointmentReminder',
        appointmentId: appt.id,
        reminderType: '2h',
        tenantId: appt.tenant_id,
        clientId: appt.client_id
      },
      {
        jobId: `reminder:push:2h:${appt.id}`,
        delay: delay2h,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    ).catch(err => console.error('Falha ao agendar lembrete push 2h:', err));
  }
};

/**
 * Cancelamento de Lembretes Push agendados no Redis/BullMQ (D1)
 */
export const cancelAppointmentReminders = async (appointmentId) => {
  if (!appointmentId) return;

  const jobIds = [
    `reminder:push:24h:${appointmentId}`,
    `reminder:push:2h:${appointmentId}`
  ];

  for (const jobId of jobIds) {
    try {
      const job = await notificationQueue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (err) {
      // Ignora erro se job já foi executado ou não existe mais na fila
    }
  }
};

/**
 * Lista as notificações In-App do profissional ou cliente
 */
export const getMyNotifications = async (tenantId, userId, isClient = false, limit = 50) => {
  const query = isClient 
    ? `SELECT id, title, body, is_read, created_at 
       FROM public.cap_notifications 
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY created_at DESC LIMIT $3`
    : `SELECT id, title, body, is_read, created_at 
       FROM public.cap_notifications 
       WHERE tenant_id = $1 AND staff_id = $2
       ORDER BY created_at DESC LIMIT $3`;

  const result = await tenantQuery(tenantId, query, [tenantId, userId, limit]);
  return result.rows;
};

/**
 * Marca notificação como lida
 */
export const markNotificationAsRead = async (tenantId, userId, isClient, notificationId) => {
  const query = isClient
    ? `UPDATE public.cap_notifications SET is_read = TRUE WHERE id = $1 AND tenant_id = $2 AND client_id = $3 RETURNING id`
    : `UPDATE public.cap_notifications SET is_read = TRUE WHERE id = $1 AND tenant_id = $2 AND staff_id = $3 RETURNING id`;
    
  const result = await tenantQuery(tenantId, query, [notificationId, tenantId, userId]);
  
  if (result.rows.length === 0) throw new Error('Notificação não encontrada.');
  return { success: true };
};

/**
 * Limpa/Deleta as notificações lidas
 */
export const clearReadNotifications = async (tenantId, userId, isClient) => {
  const query = isClient
    ? `DELETE FROM public.cap_notifications WHERE is_read = TRUE AND tenant_id = $1 AND client_id = $2`
    : `DELETE FROM public.cap_notifications WHERE is_read = TRUE AND tenant_id = $1 AND staff_id = $2`;

  await tenantQuery(tenantId, query, [tenantId, userId]);
  return { success: true };
};

