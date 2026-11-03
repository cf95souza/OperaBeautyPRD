import redisClient from '../config/redis.js';

/**
 * Utilitário defensivo para operações com Redis no OperaBeauty SaaS.
 * Garante que falhas, quedas ou reinicializações do Redis não quebrem as requisições,
 * permitindo fallback transparente e resiliente para o PostgreSQL.
 */

export const safeCacheGet = async (key) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return null;
    }
    return await redisClient.get(key);
  } catch (err) {
    console.warn(`[Cache Warning] Falha não-bloqueante no GET da chave "${key}":`, err.message);
    return null;
  }
};

export const safeCacheSet = async (key, ttlSeconds, value) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return false;
    }
    await redisClient.setex(key, ttlSeconds, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[Cache Warning] Falha não-bloqueante no SET da chave "${key}":`, err.message);
    return false;
  }
};

export const safeCacheDel = async (key) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return false;
    }
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`[Cache Warning] Falha não-bloqueante no DEL da chave "${key}":`, err.message);
    return false;
  }
};

