import { createClient, RedisClientType } from 'redis';
import NodeCache from 'node-cache';
import { ENV } from '../config/env';

// Initialize the In-Memory cache as our reliable fallback (TTL: 5 minutes)
const memoryCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

if (ENV.REDIS_URL) {
  console.log(`[CacheService] Redis URL detected: ${ENV.REDIS_URL}. Attempting to connect...`);
  redisClient = createClient({
    url: ENV.REDIS_URL,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('[CacheService] Redis connection failed after 3 retries. Falling back to in-memory cache.');
          isRedisConnected = false;
          return new Error('Max retries reached');
        }
        return 1000; // Reconnect after 1s
      }
    }
  });

  redisClient.on('error', (err) => {
    // Gracefully catch Redis connection errors
    if (isRedisConnected) {
      console.warn('[CacheService] Redis connection lost. Switching to in-memory cache fallback.', err.message);
      isRedisConnected = false;
    }
  });

  redisClient.on('connect', () => {
    console.log('[CacheService] Redis client connected.');
    isRedisConnected = true;
  });

  // Start the async connection
  redisClient.connect().catch((err) => {
    console.warn('[CacheService] Failed to establish Redis connection. Using in-memory cache fallback.', err.message);
    isRedisConnected = false;
  });
} else {
  console.log('[CacheService] No REDIS_URL provided. Defaulting to in-memory caching.');
}

export const cacheService = {
  /**
   * Retrieve a value from the cache
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      if (isRedisConnected && redisClient) {
        const value = await redisClient.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
      }
    } catch (err) {
      console.error(`[CacheService] Redis GET error for key ${key}:`, err);
    }

    // Fallback to in-memory cache
    const memoryValue = memoryCache.get(key);
    if (memoryValue !== undefined) {
      return memoryValue as T;
    }

    return null;
  },

  /**
   * Store a value in the cache
   * @param key Cache key
   * @param value Cache value (serializable object)
   * @param ttlSeconds Optional custom expiration time in seconds (defaults to 300s/5m)
   */
  set: async (key: string, value: any, ttlSeconds: number = 300): Promise<boolean> => {
    const serializedValue = JSON.stringify(value);

    // Try setting in Redis
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, serializedValue, {
          EX: ttlSeconds,
        });
        return true;
      } catch (err) {
        console.error(`[CacheService] Redis SET error for key ${key}:`, err);
      }
    }

    // Set in local in-memory cache
    return memoryCache.set(key, value, ttlSeconds);
  },

  /**
   * Delete a key from the cache
   */
  del: async (key: string): Promise<boolean> => {
    let deletedFromRedis = false;

    if (isRedisConnected && redisClient) {
      try {
        const result = await redisClient.del(key);
        deletedFromRedis = result > 0;
      } catch (err) {
        console.error(`[CacheService] Redis DEL error for key ${key}:`, err);
      }
    }

    const deletedFromMemory = memoryCache.del(key) > 0;
    return deletedFromRedis || deletedFromMemory;
  },

  /**
   * Check if Redis is currently connected
   */
  isUsingRedis: (): boolean => {
    return isRedisConnected;
  }
};

export default cacheService;
