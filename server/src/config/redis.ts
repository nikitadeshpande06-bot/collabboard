import Redis from 'ioredis';
import { logger } from '../utils/logger';

let client: Redis | null = null;

export function getRedis(): Redis | null {
  return client;
}

/**
 * Try to connect to Redis.  If Redis is unavailable (not installed, wrong URL)
 * we log a warning and continue — Socket.IO will fall back to its in-memory
 * adapter and everything still works for a single-instance dev setup.
 */
export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

  try {
    const instance = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });

    instance.on('error', () => { /* suppress — handled below */ });

    await instance.connect();
    client = instance;
    client.on('error', (err) => logger.warn('Redis error (non-fatal)', err.message));
    logger.info('✅ Redis connected');
  } catch (err) {
    logger.warn('⚠️  Redis unavailable — running without it (single-instance mode)');
  }
}
