import webpush from 'web-push';
import pool from '../config/db.js';
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
  
  await pool.query(
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
  
  await pool.query(
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
  await pool.query(
    `INSERT INTO public.cap_notifications (tenant_id, staff_id, title, body)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, staffId, title, body]
  );

  // 2. Buscar todas as assinaturas ativas (celulares/PCs) desse profissional
  const subsResult = await pool.query(
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
    });
  });

  await Promise.all(pushPromises);
};

/**
 * Envia uma notificação (In-App e Push) para um cliente
 */
export const notifyClient = async (tenantId, clientId, title, body, actionUrl = null) => {
  // 1. Salvar notificação In-App
  await pool.query(
    `INSERT INTO public.cap_notifications (tenant_id, client_id, title, body)
     VALUES ($1, $2, $3, $4)`,
    [tenantId, clientId, title, body]
  );

  // 2. Buscar assinaturas
  const subsResult = await pool.query(
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
    });
  });

  await Promise.all(pushPromises);
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

  const result = await pool.query(query, [tenantId, userId, limit]);
  return result.rows;
};

/**
 * Marca notificação como lida
 */
export const markNotificationAsRead = async (tenantId, userId, isClient, notificationId) => {
  const query = isClient
    ? `UPDATE public.cap_notifications SET is_read = TRUE WHERE id = $1 AND tenant_id = $2 AND client_id = $3 RETURNING id`
    : `UPDATE public.cap_notifications SET is_read = TRUE WHERE id = $1 AND tenant_id = $2 AND staff_id = $3 RETURNING id`;
    
  const result = await pool.query(query, [notificationId, tenantId, userId]);
  
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

  await pool.query(query, [tenantId, userId]);
  return { success: true };
};
