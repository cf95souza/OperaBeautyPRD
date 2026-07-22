import { Queue } from 'bullmq';
import redisClient from './redis.js';

export const notificationQueue = new Queue('notifications', {
  connection: redisClient
});
