import rateLimit from 'express-rate-limit';
import pino from 'pino';
import redisClient from '../config/redis.js';

const logger = pino();

// Constantes de Governança de Segurança (C14)
export const MAX_FAILED_ATTEMPTS = 5;
export const BLOCK_DURATION_SECONDS = 15 * 60; // 15 minutos
export const WINDOW_SECONDS = 15 * 60; // 15 minutos

// Memória local de fallback caso o Redis esteja indisponível ou em testes unitários
const localFailsStore = new Map();
const localBlockStore = new Map();

function getStoreKey(tenantId, ip, userId) {
  const cleanTenant = tenantId || 'global';
  const cleanIp = (ip || 'unknown').replace(/:/g, '_');
  const cleanUser = userId || 'anon';
  return `giftcard_attempt:${cleanTenant}:${cleanIp}:${cleanUser}`;
}

function getBlockKey(tenantId, ip, userId) {
  const cleanTenant = tenantId || 'global';
  const cleanIp = (ip || 'unknown').replace(/:/g, '_');
  const cleanUser = userId || 'anon';
  return `giftcard_blocked:${cleanTenant}:${cleanIp}:${cleanUser}`;
}

/**
 * Verifica se o requisitante está temporariamente bloqueado por exceder tentativas
 */
export async function isGiftCardBlocked(tenantId, ip, userId) {
  const blockKey = getBlockKey(tenantId, ip, userId);
  
  // 1. Tentar verificar no Redis
  try {
    if (redisClient && redisClient.status === 'ready') {
      const blocked = await redisClient.get(blockKey);
      if (blocked) return true;
    }
  } catch (err) {
    logger.warn({ err }, 'Falha ao consultar bloqueio no Redis, usando fallback em memória');
  }

  // 2. Fallback em memória
  const localExpiresAt = localBlockStore.get(blockKey);
  if (localExpiresAt) {
    if (Date.now() < localExpiresAt) {
      return true;
    }
    localBlockStore.delete(blockKey);
  }

  return false;
}

/**
 * Registra uma tentativa falha (código inválido/não encontrado) e bloqueia se atingir o teto
 */
export async function recordFailedGiftCardAttempt(tenantId, ip, userId) {
  const failKey = getStoreKey(tenantId, ip, userId);
  const blockKey = getBlockKey(tenantId, ip, userId);
  let currentAttempts = 1;

  // 1. Tentar registrar no Redis
  let redisSuccess = false;
  try {
    if (redisClient && redisClient.status === 'ready') {
      currentAttempts = await redisClient.incr(failKey);
      if (currentAttempts === 1) {
        await redisClient.expire(failKey, WINDOW_SECONDS);
      }
      if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
        await redisClient.setex(blockKey, BLOCK_DURATION_SECONDS, '1');
        await redisClient.del(failKey);
        logger.warn(
          { tenantId, ip, userId, attempts: currentAttempts },
          '[Segurança C14] Força bruta detectada no resgate de vale-presente. Bloqueio temporário de 15 minutos ativado.'
        );
      }
      redisSuccess = true;
    }
  } catch (err) {
    logger.warn({ err }, 'Falha ao registrar tentativa no Redis, usando fallback em memória');
  }

  // 2. Fallback ou sincronização em memória
  if (!redisSuccess) {
    const existing = localFailsStore.get(failKey);
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      currentAttempts = existing.count + 1;
    } else {
      currentAttempts = 1;
    }
    
    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      localBlockStore.set(blockKey, now + (BLOCK_DURATION_SECONDS * 1000));
      localFailsStore.delete(failKey);
      logger.warn(
        { tenantId, ip, userId, attempts: currentAttempts },
        '[Segurança C14] Força bruta detectada no resgate de vale-presente (memória). Bloqueio temporário de 15 minutos ativado.'
      );
    } else {
      localFailsStore.set(failKey, {
        count: currentAttempts,
        expiresAt: now + (WINDOW_SECONDS * 1000)
      });
    }
  }

  const isBlocked = currentAttempts >= MAX_FAILED_ATTEMPTS;
  return {
    attempts: currentAttempts,
    isBlocked,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts)
  };
}

/**
 * Reseta o contador de falhas e bloqueios após resgate ou validação com sucesso
 */
export async function resetGiftCardAttempts(tenantId, ip, userId) {
  const failKey = getStoreKey(tenantId, ip, userId);
  const blockKey = getBlockKey(tenantId, ip, userId);

  try {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.del(failKey, blockKey).catch(() => {});
    }
  } catch (err) {
    // silencioso
  }

  localFailsStore.delete(failKey);
  localBlockStore.delete(blockKey);
}

/**
 * Limpa todo o armazenamento local (usado para isolamento de testes)
 */
export function clearAllLocalGiftCardAttempts() {
  localFailsStore.clear();
  localBlockStore.clear();
}

/**
 * Middleware express para bloquear requisições caso o requisitante esteja em cooldown
 */
export async function checkGiftCardBruteForce(req, res, next) {
  const tenantId = req.user?.tenant_id || req.body?.tenant_id || req.query?.tenant_id || req.headers['x-tenant-id'] || null;
  const ip = req.ip;
  const userId = req.user?.id || req.headers['x-user-id'] || null;

  try {
    const blocked = await isGiftCardBlocked(tenantId, ip, userId);
    if (blocked) {
      return res.status(429).json({
        error: 'Muitas tentativas inválidas de resgate de vale-presente. O resgate foi temporariamente bloqueado por 15 minutos por segurança.'
      });
    }
    next();
  } catch (err) {
    req.log ? req.log.error(err) : logger.error(err);
    next(); // Fail open para não derrubar se erro inesperado no middleware
  }
}

/**
 * Rate Limiter HTTP padrão para rotas de vale-presente (30 req / 10 min por IP)
 */
export const giftCardIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições de vale-presente. Aguarde alguns minutos.' },
  statusCode: 429
});
