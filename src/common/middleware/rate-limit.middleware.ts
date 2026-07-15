import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../config/redis.js';
import { LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW } from '../../config/index.js';

/**
 * Generic rate limit middleware factory.
 *
 * @param prefix - Redis key prefix
 * @param limit - Max requests per window
 * @param windowMs - Window size in milliseconds
 * @param keyFn - How to derive the key (default: IP address)
 */
export function rateLimit(
  prefix: string,
  limit: number,
  windowMs: number,
  keyFn: (req: Request) => string = (req) => req.ip || 'unknown'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      // ponytail: when Redis is unreachable, commands queue forever
      // (the client's reconnectStrategy retries with backoff and never
      // rejects). Skip rate-limiting in that case so login doesn't hang.
      if (!redis.isReady) return next();
      const key = `ratelimit:${prefix}:${keyFn(req)}`;
      const now = Date.now();

      // Use Redis sorted set for sliding window rate limiting
      // Remove entries older than window
      await redis.zRemRangeByScore(key, 0, now - windowMs);

      // Count current entries
      const count = await redis.zCard(key);

      if (count >= limit) {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Limit: ${limit} per ${windowMs / 1000} seconds.`,
            retryAfterMs: windowMs,
          },
        });
        return;
      }

      // Add current request
      await redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      // Set expiry on the key
      await redis.expire(key, Math.ceil(windowMs / 1000) + 1);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count - 1).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());

      next();
    } catch (error) {
      // If Redis fails, fail open (allow request) but log
      console.error('Rate limit Redis error:', error);
      next();
    }
  };
}

/**
 * Login rate limiter: 5 attempts per IP per 15 minutes.
 * Uses email/identifier composite key to limit per-account attacks.
 */
export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  return rateLimit(
    'login',
    LOGIN_RATE_LIMIT,
    LOGIN_RATE_WINDOW,
    (req: Request) => {
      // Key by IP + email/phone combination to prevent distributed attacks
      const email = req.body?.email || req.body?.phone || '';
      const ip = req.ip || 'unknown';
      return `${ip}:${email.toLowerCase()}`;
    }
  )(req, res, next);
}

/**
 * API general rate limiter: 100 requests per minute per IP.
 */
export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  const { API_RATE_LIMIT, API_RATE_WINDOW } = require('../../config/index.js');
  return rateLimit('api', API_RATE_LIMIT, API_RATE_WINDOW)(req, res, next);
}

/**
 * Strict rate limit for sensitive endpoints: 10 requests per minute per IP.
 */
export function strictRateLimit(req: Request, res: Response, next: NextFunction) {
  return rateLimit('strict', 10, 60000)(req, res, next);
}