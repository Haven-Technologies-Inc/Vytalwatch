/**
 * ReshADX - Rate Limiter Middleware
 * Production-ready rate limiting with Redis backend
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let rateLimiterInstance: RateLimiterRedis | RateLimiterMemory;
let authRateLimiterInstance: RateLimiterRedis | RateLimiterMemory;

/**
 * Account tier rate limits (requests per minute)
 */
const tierLimits: Record<string, number> = {
  FREE: 60,
  STARTUP: 300,
  GROWTH: 1000,
  BUSINESS: 3000,
  ENTERPRISE: 10000,
};

/**
 * Initialize rate limiters
 */
const initializeRateLimiters = async (): Promise<void> => {
  try {
    const redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    // Test connection
    await redisClient.ping();

    // Main API rate limiter
    rateLimiterInstance = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rshx_rl',
      points: 1000, // Max requests
      duration: 60, // Per minute
      blockDuration: 60, // Block for 1 minute if exceeded
    });

    // Auth rate limiter (stricter)
    authRateLimiterInstance = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rshx_rl_auth',
      points: 10, // Max auth attempts
      duration: 900, // Per 15 minutes
      blockDuration: 300, // Block for 5 minutes if exceeded
    });

    logger.info('Rate limiters initialized with Redis backend');
  } catch (error) {
    logger.warn('Redis unavailable, falling back to memory rate limiter', { error });

    // Fallback to memory-based limiter
    rateLimiterInstance = new RateLimiterMemory({
      points: 1000,
      duration: 60,
      blockDuration: 60,
    });

    authRateLimiterInstance = new RateLimiterMemory({
      points: 10,
      duration: 900,
      blockDuration: 300,
    });
  }
};

// Initialize on module load
initializeRateLimiters();

/**
 * Get rate limit key for request
 */
const getRateLimitKey = (req: Request): string => {
  // Priority: User ID > API Key ID > IP
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  if (req.apiKey?.apiKeyId) {
    return `apikey:${req.apiKey.apiKeyId}`;
  }
  return `ip:${req.ip}`;
};

/**
 * Get tier-based point cost
 */
const getPointCost = (req: Request): number => {
  // Could be adjusted based on endpoint weight
  return 1;
};

/**
 * Main rate limiter middleware factory
 */
export const rateLimiter = (options?: {
  windowMs?: number;
  max?: number;
}): ((req: Request, res: Response, next: NextFunction) => void) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!rateLimiterInstance) {
      await initializeRateLimiters();
    }

    const key = getRateLimitKey(req);
    const pointCost = getPointCost(req);

    try {
      const result = await rateLimiterInstance.consume(key, pointCost);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimiterInstance.points);
      res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());

      next();
    } catch (error: any) {
      // Rate limit exceeded
      const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 60;

      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', rateLimiterInstance.points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (error.msBeforeNext || 60000)).toISOString());

      logger.warn('Rate limit exceeded', {
        key,
        ip: req.ip,
        path: req.path,
        retryAfter,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        request_id: res.getHeader('X-Request-ID'),
      });
    }
  };
};

/**
 * Strict auth rate limiter for login/register endpoints
 */
export const rateLimitAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!authRateLimiterInstance) {
    await initializeRateLimiters();
  }

  const key = `auth:${req.ip}`;

  try {
    const result = await authRateLimiterInstance.consume(key);

    res.setHeader('X-RateLimit-Limit', authRateLimiterInstance.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);

    next();
  } catch (error: any) {
    const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 300;

    res.setHeader('Retry-After', retryAfter);

    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      retryAfter,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter,
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }
};

/**
 * Tier-based rate limiter
 */
export const rateLimitAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user's tier limit
  const tier = (req.user as any)?.tier || 'FREE';
  const limit = tierLimits[tier] || tierLimits.FREE;

  const key = getRateLimitKey(req);

  try {
    // Create dynamic limiter based on tier
    const tierLimiter = new RateLimiterMemory({
      points: limit,
      duration: 60,
    });

    const result = await tierLimiter.consume(key);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Tier', tier);

    next();
  } catch (error: any) {
    const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 60;

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded for ${tier} tier. Upgrade for higher limits.`,
        retryAfter,
        currentTier: tier,
        upgradeUrl: '/pricing',
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }
};

export default rateLimiter;
