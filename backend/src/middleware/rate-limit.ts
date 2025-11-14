/**
 * ReshADX - Rate Limiting Middleware
 * Protects API from abuse using Redis-backed rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Redis client for rate limiting
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  enableOfflineQueue: false,
});

// Rate limiter for authentication endpoints (stricter)
const authRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:auth',
  points: config.rateLimit.auth.maxRequests, // Number of requests
  duration: config.rateLimit.auth.windowMs / 1000, // Convert ms to seconds
  blockDuration: 300, // Block for 5 minutes after exceeding limit
});

// Rate limiter for general API endpoints
const apiRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:api',
  points: config.rateLimit.global.maxRequests,
  duration: config.rateLimit.global.windowMs / 1000,
  blockDuration: 60, // Block for 1 minute
});

// Tier-based rate limiters
const tierRateLimiters: { [key: string]: RateLimiterRedis } = {
  FREE: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:tier:free',
    points: config.rateLimit.api.free.maxRequests,
    duration: 60, // 1 minute
  }),
  STARTUP: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:tier:startup',
    points: config.rateLimit.api.startup.maxRequests,
    duration: 60,
  }),
  GROWTH: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:tier:growth',
    points: config.rateLimit.api.growth.maxRequests,
    duration: 60,
  }),
  BUSINESS: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:tier:business',
    points: config.rateLimit.api.business.maxRequests,
    duration: 60,
  }),
  ENTERPRISE: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:tier:enterprise',
    points: config.rateLimit.api.enterprise.maxRequests,
    duration: 60,
  }),
};

/**
 * Get rate limiter key based on user or IP
 */
const getRateLimiterKey = (req: Request): string => {
  // Use user ID if authenticated
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // Use API key ID if using API key
  if (req.apiKey?.apiKeyId) {
    return `apikey:${req.apiKey.apiKeyId}`;
  }

  // Fall back to IP address
  return `ip:${req.ip}`;
};

/**
 * Get user's account tier for rate limiting
 */
const getUserTier = async (req: Request): Promise<string> => {
  // Default to FREE tier
  let tier = 'FREE';

  if (req.user?.userId) {
    try {
      const db = require('../database').default;
      const user = await db('users')
        .where({ user_id: req.user.userId })
        .select('account_tier')
        .first();

      if (user?.account_tier) {
        tier = user.account_tier;
      }
    } catch (error) {
      logger.error('Error fetching user tier for rate limiting', { error });
    }
  }

  return tier;
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const rateLimitAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const key = getRateLimiterKey(req);

  try {
    await authRateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    const retryAfter =
      rateLimiterRes instanceof RateLimiterRes
        ? Math.round(rateLimiterRes.msBeforeNext / 1000)
        : 60;

    logger.warn('Rate limit exceeded (auth)', {
      key,
      path: req.path,
      ip: req.ip,
    });

    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }
};

/**
 * Rate limiting middleware for general API endpoints
 */
export const rateLimitAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const key = getRateLimiterKey(req);
  const tier = await getUserTier(req);
  const rateLimiter = tierRateLimiters[tier] || tierRateLimiters.FREE;

  try {
    const rateLimiterRes = await rateLimiter.consume(key);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': String(rateLimiter.points),
      'X-RateLimit-Remaining': String(rateLimiterRes.remainingPoints),
      'X-RateLimit-Reset': String(
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      ),
    });

    next();
  } catch (rateLimiterRes) {
    const retryAfter =
      rateLimiterRes instanceof RateLimiterRes
        ? Math.round(rateLimiterRes.msBeforeNext / 1000)
        : 60;

    logger.warn('Rate limit exceeded (API)', {
      key,
      tier,
      path: req.path,
      ip: req.ip,
    });

    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded for ${tier} tier. Please upgrade or try again later.`,
        retryAfter,
        tier,
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }
};

/**
 * Rate limiting middleware for webhook endpoints (less strict)
 */
export const rateLimitWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const key = getRateLimiterKey(req);

  try {
    await apiRateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    const retryAfter =
      rateLimiterRes instanceof RateLimiterRes
        ? Math.round(rateLimiterRes.msBeforeNext / 1000)
        : 60;

    logger.warn('Rate limit exceeded (webhook)', {
      key,
      path: req.path,
      ip: req.ip,
    });

    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many webhook requests. Please try again later.',
        retryAfter,
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }
};
