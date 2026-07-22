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
