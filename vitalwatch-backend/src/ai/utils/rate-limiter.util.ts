import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxTokensPerDay?: number;
  maxCostPerDay?: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

@Injectable()
export class RateLimiterUtil {
  private static readonly logger = new Logger(RateLimiterUtil.name);

  // In-memory storage (in production, use Redis)
  private static requestCounts = new Map<string, { count: number; resetAt: number }>();
  private static tokenCounts = new Map<string, { count: number; resetAt: number }>();
  private static costCounts = new Map<string, { amount: number; resetAt: number }>();

  // Default rate limits
  private static readonly DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
    patient: {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
      maxTokensPerDay: 50000,
      maxCostPerDay: 1.0,
    },
    provider: {
      maxRequests: 500,
      windowMs: 60 * 60 * 1000, // 1 hour
      maxTokensPerDay: 200000,
      maxCostPerDay: 5.0,
    },
    admin: {
      maxRequests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
      maxTokensPerDay: 500000,
      maxCostPerDay: 20.0,
    },
  };

  /**
   * Check if request is allowed based on rate limits
   */
  static checkRateLimit(
    userId: string,
    userRole: string,
    incrementBy: number = 1,
  ): RateLimitStatus {
    const config = this.DEFAULT_LIMITS[userRole.toLowerCase()] || this.DEFAULT_LIMITS.patient;
    const key = `requests:${userId}`;
    const now = Date.now();

    const record = this.requestCounts.get(key);

    if (!record || now >= record.resetAt) {
      // Create new window
      const resetAt = now + config.windowMs;
      this.requestCounts.set(key, { count: incrementBy, resetAt });

      return {
        allowed: true,
        remaining: config.maxRequests - incrementBy,
        resetAt: new Date(resetAt),
      };
    }

    // Check if limit exceeded
    if (record.count + incrementBy > config.maxRequests) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(record.resetAt),
        reason: 'Request rate limit exceeded',
      };
    }

    // Increment count
    record.count += incrementBy;
    this.requestCounts.set(key, record);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetAt: new Date(record.resetAt),
    };
  }

  /**
   * Check token usage limits
   */
  static checkTokenLimit(
    userId: string,
    userRole: string,
    tokens: number,
  ): RateLimitStatus {
    const config = this.DEFAULT_LIMITS[userRole.toLowerCase()] || this.DEFAULT_LIMITS.patient;
    const key = `tokens:${userId}`;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const record = this.tokenCounts.get(key);

    if (!record || now >= record.resetAt) {
      // Create new window (daily)
      const resetAt = now + oneDayMs;
      this.tokenCounts.set(key, { count: tokens, resetAt });

      return {
        allowed: true,
        remaining: (config.maxTokensPerDay || 0) - tokens,
        resetAt: new Date(resetAt),
      };
    }

    // Check if limit exceeded
    const newTotal = record.count + tokens;
    if (newTotal > (config.maxTokensPerDay || Infinity)) {
      this.logger.warn(`Token limit exceeded for user ${userId}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(record.resetAt),
        reason: 'Daily token limit exceeded',
      };
    }

    // Increment count
    record.count = newTotal;
    this.tokenCounts.set(key, record);

    return {
      allowed: true,
      remaining: (config.maxTokensPerDay || 0) - record.count,
      resetAt: new Date(record.resetAt),
    };
  }

  /**
   * Check cost limits
   */
  static checkCostLimit(
    userId: string,
    userRole: string,
    cost: number,
  ): RateLimitStatus {
    const config = this.DEFAULT_LIMITS[userRole.toLowerCase()] || this.DEFAULT_LIMITS.patient;
    const key = `cost:${userId}`;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const record = this.costCounts.get(key);

    if (!record || now >= record.resetAt) {
      // Create new window (daily)
      const resetAt = now + oneDayMs;
      this.costCounts.set(key, { amount: cost, resetAt });

      return {
        allowed: true,
        remaining: (config.maxCostPerDay || 0) - cost,
        resetAt: new Date(resetAt),
      };
    }

    // Check if limit exceeded
    const newTotal = record.amount + cost;
    if (newTotal > (config.maxCostPerDay || Infinity)) {
      this.logger.warn(`Cost limit exceeded for user ${userId}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(record.resetAt),
        reason: 'Daily cost limit exceeded',
      };
    }

    // Increment amount
    record.amount = newTotal;
    this.costCounts.set(key, record);

    return {
      allowed: true,
      remaining: (config.maxCostPerDay || 0) - record.amount,
      resetAt: new Date(record.resetAt),
    };
  }

  /**
   * Get current usage stats for user
   */
  static getUsageStats(userId: string): {
    requests: { used: number; remaining: number; resetAt: Date | null };
    tokens: { used: number; remaining: number; resetAt: Date | null };
    cost: { used: number; remaining: number; resetAt: Date | null };
  } {
    const requestRecord = this.requestCounts.get(`requests:${userId}`);
    const tokenRecord = this.tokenCounts.get(`tokens:${userId}`);
    const costRecord = this.costCounts.get(`cost:${userId}`);

    return {
      requests: {
        used: requestRecord?.count || 0,
        remaining: 100 - (requestRecord?.count || 0),
        resetAt: requestRecord ? new Date(requestRecord.resetAt) : null,
      },
      tokens: {
        used: tokenRecord?.count || 0,
        remaining: 50000 - (tokenRecord?.count || 0),
        resetAt: tokenRecord ? new Date(tokenRecord.resetAt) : null,
      },
      cost: {
        used: costRecord?.amount || 0,
        remaining: 1.0 - (costRecord?.amount || 0),
        resetAt: costRecord ? new Date(costRecord.resetAt) : null,
      },
    };
  }

  /**
   * Reset limits for a user (admin function)
   */
  static resetLimits(userId: string): void {
    this.requestCounts.delete(`requests:${userId}`);
    this.tokenCounts.delete(`tokens:${userId}`);
    this.costCounts.delete(`cost:${userId}`);
    this.logger.log(`Reset rate limits for user ${userId}`);
  }

  /**
   * Clean up expired records (should be called periodically)
   */
  static cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean requests
    for (const [key, record] of this.requestCounts.entries()) {
      if (now >= record.resetAt) {
        this.requestCounts.delete(key);
        cleaned++;
      }
    }

    // Clean tokens
    for (const [key, record] of this.tokenCounts.entries()) {
      if (now >= record.resetAt) {
        this.tokenCounts.delete(key);
        cleaned++;
      }
    }

    // Clean costs
    for (const [key, record] of this.costCounts.entries()) {
      if (now >= record.resetAt) {
        this.costCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit records`);
    }
  }
}

// Run cleanup every hour
setInterval(() => RateLimiterUtil.cleanup(), 60 * 60 * 1000);
