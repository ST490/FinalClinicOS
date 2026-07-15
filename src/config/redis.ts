import { createClient, RedisClientType } from 'redis';
import { REDIS_URL } from './index.js';

declare global {
  // Prevent multiple instances during hot reload in development
  // eslint-disable-next-line no-var
  var redis: RedisClientType | undefined;
}

let redisClient: RedisClientType;

// ponytail: redis@4 client.connect() DOES NOT REJECT on ECONNREFUSED —
// with a reconnect strategy it stays pending forever, silently retrying.
// Awaiting it from middleware (rate-limit) hangs the whole request handler.
// Fix: kick off connect in the background. If connect fails the client
// raises 'error' events; commands throw until ready, and the middleware's
// try/catch already fails-open on every redis call. The login flow then
// responds in milliseconds even with no local Redis.
async function ensureConnected(client: RedisClientType): Promise<void> {
  try {
    await client.connect();
  } catch {
    // Swallow — ongoing errors surface via the 'error' listener; commands
    // fail and the middleware falls back to allow.
  }
}

export function getRedisClient(): RedisClientType {
  if (global.redis) {
    return global.redis;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        // Keep retries gentle so 'error' logs don't spam every second.
        reconnectStrategy: (retries) => Math.min(60_000, 1_000 * 2 ** retries),
      },
    });

    redisClient.on('error', (err) => {
      if (!(redisClient as any).__warnedOnce) {
        console.warn('⚠ Redis unavailable (rate limiting disabled):', err.message);
        (redisClient as any).__warnedOnce = true;
      }
    });

    // Fire-and-forget connect — middleware rejects commands until ready
    // and catches that in its existing try/catch.
    void ensureConnected(redisClient);
  }

  if (process.env.NODE_ENV !== 'production') {
    global.redis = redisClient;
  }

  return redisClient;
}

export default getRedisClient;
