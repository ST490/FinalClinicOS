import { createClient, RedisClientType } from 'redis';
import { REDIS_URL } from './index.js';

declare global {
  // Prevent multiple instances during hot reload in development
  // eslint-disable-next-line no-var
  var redis: RedisClientType | undefined;
}

let redisClient: RedisClientType;

export async function getRedisClient(): Promise<RedisClientType> {
  if (global.redis) {
    return global.redis;
  }

  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    await redisClient.connect();
  }

  if (process.env.NODE_ENV !== 'production') {
    global.redis = redisClient;
  }

  return redisClient;
}

// For non-async contexts, export client directly (assumes connect() called first)
export const redis = {
  get client() {
    if (!global.redis) {
      throw new Error('Redis not initialized. Call getRedisClient() first.');
    }
    return global.redis;
  }
};

export default redis.client;