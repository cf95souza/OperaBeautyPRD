import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

redisClient.on('error', (err) => {
  logger.error(err, 'Redis Client Error');
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

export default redisClient;
