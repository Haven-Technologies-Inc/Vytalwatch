import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis';
import { AuditService } from '../../audit/audit.service';

export interface LoginAttempt {
  email: string;
  ip: string;
  timestamp: string;
  success: boolean;
}

export interface AccountLockout {
  userId: string;
  lockedUntil: string;
  failedAttempts: number;
  lastAttempt: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
  message?: string;
}

// Redis key prefixes
const KEYS = {
  LOGIN_ATTEMPTS: 'auth:login_attempts:',
  ACCOUNT_LOCKOUT: 'auth:lockout:',
  TOKEN_BLACKLIST: 'auth:blacklist:',
  PASSWORD_HISTORY: 'auth:pwd_history:',
  USER_TOKENS: 'auth:user_tokens:',
} as const;

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);

  // Configuration
  private readonly MAX_FAILED_ATTEMPTS: number;
  private readonly LOCKOUT_DURATION_MINUTES: number;
  private readonly RATE_LIMIT_WINDOW_MINUTES: number;
  private readonly PASSWORD_HISTORY_COUNT: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.MAX_FAILED_ATTEMPTS = this.configService.get('security.maxFailedAttempts') || 5;
    this.LOCKOUT_DURATION_MINUTES = this.configService.get('security.lockoutDurationMinutes') || 15;
    this.RATE_LIMIT_WINDOW_MINUTES =
      this.configService.get('security.rateLimitWindowMinutes') || 15;
    this.PASSWORD_HISTORY_COUNT = this.configService.get('security.passwordHistoryCount') || 5;
  }

  // ==================== RATE LIMITING ====================

  async checkRateLimit(email: string, ip: string): Promise<RateLimitResult> {
    // Skip rate limiting if Redis is unavailable
    try {
      await this.redis.ping();
    } catch {
      this.logger.warn('Redis unavailable - skipping rate limit check');
      return { allowed: true, remainingAttempts: this.MAX_FAILED_ATTEMPTS };
    }
    const now = new Date();

    // Check if account is locked
    const lockoutData = await this.redis.get(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
    if (lockoutData) {
      const lockout: AccountLockout = JSON.parse(lockoutData);
      const lockedUntil = new Date(lockout.lockedUntil);

      if (lockedUntil > now) {
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutUntil: lockedUntil,
          message: `Account locked. Try again in ${remainingMinutes} minute(s).`,
        };
      }
      // Lockout expired, clean up
      await this.redis.del(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
    }

    // Get recent failed attempts count from Redis sorted set
    const key = KEYS.LOGIN_ATTEMPTS + this.getRateLimitKey(email, ip);
    const windowStart = now.getTime() - this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

    // Remove expired attempts
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count recent failed attempts
    const recentFailedCount = await this.redis.zcard(key);

    const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - recentFailedCount);

    if (recentFailedCount >= this.MAX_FAILED_ATTEMPTS) {
      await this.lockAccount(email, ip);
      const lockoutUntilDate = new Date(now.getTime() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil: lockoutUntilDate,
        message: `Too many failed attempts. Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
      };
    }

    return {
      allowed: true,
      remainingAttempts,
    };
  }

  async recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
    // Skip if Redis is unavailable
    try {
      await this.redis.ping();
    } catch {
      this.logger.warn('Redis unavailable - skipping login attempt recording');
      return;
    }
    const key = KEYS.LOGIN_ATTEMPTS + this.getRateLimitKey(email, ip);
    const now = Date.now();
    const windowTtl = this.RATE_LIMIT_WINDOW_MINUTES * 60;

    if (success) {
      // Clear failed attempts and lockout on successful login
      await this.redis.del(key);
      await this.redis.del(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
      this.logger.log(`Successful login for ${email} from ${ip}`);
    } else {
      // Add failed attempt to sorted set (score = timestamp)
      const attemptId = `${now}:${crypto.randomBytes(4).toString('hex')}`;
      await this.redis.zadd(key, now, attemptId);
      await this.redis.expire(key, windowTtl);

      const failedCount = await this.redis.zcard(key);
      this.logger.warn(
        `Failed login attempt ${failedCount}/${this.MAX_FAILED_ATTEMPTS} for ${email} from ${ip}`,
      );

      await this.auditService.log({
        action: 'LOGIN_FAILED_ATTEMPT',
        details: {
          email,
          ip,
          attemptNumber: failedCount,
          maxAttempts: this.MAX_FAILED_ATTEMPTS,
        },
      });
    }
  }

  private getRateLimitKey(email: string, ip: string): string {
    return `${email.toLowerCase()}:${ip}`;
  }

  // ==================== ACCOUNT LOCKOUT ====================

  async lockAccount(email: string, ip: string): Promise<void> {
    const lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    const lockoutTtl = this.LOCKOUT_DURATION_MINUTES * 60;

    const lockout: AccountLockout = {
      userId: email.toLowerCase(),
      lockedUntil: lockedUntil.toISOString(),
      failedAttempts: this.MAX_FAILED_ATTEMPTS,
      lastAttempt: new Date().toISOString(),
    };

    await this.redis.setex(
      KEYS.ACCOUNT_LOCKOUT + email.toLowerCase(),
      lockoutTtl,
      JSON.stringify(lockout),
    );

    this.logger.warn(`Account locked: ${email} until ${lockedUntil.toISOString()}`);

    await this.auditService.log({
      action: 'ACCOUNT_LOCKED',
      details: {
        email,
        ip,
        lockedUntil: lockedUntil.toISOString(),
        durationMinutes: this.LOCKOUT_DURATION_MINUTES,
      },
    });
  }

  async unlockAccount(email: string, adminUserId?: string): Promise<void> {
    // Remove lockout
    await this.redis.del(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());

    // Clear login attempts for this email (scan for all IP-based keys)
    const pattern = KEYS.LOGIN_ATTEMPTS + email.toLowerCase() + ':*';
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');

    this.logger.log(`Account unlocked: ${email} by ${adminUserId || 'system'}`);

    await this.auditService.log({
      action: 'ACCOUNT_UNLOCKED',
      userId: adminUserId,
      details: { email },
    });
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const lockoutData = await this.redis.get(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
    if (!lockoutData) return false;

    const lockout: AccountLockout = JSON.parse(lockoutData);
    if (new Date(lockout.lockedUntil) <= new Date()) {
      await this.redis.del(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
      return false;
    }

    return true;
  }

  async getAccountLockoutInfo(email: string): Promise<AccountLockout | null> {
    const lockoutData = await this.redis.get(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
    if (!lockoutData) return null;

    const lockout: AccountLockout = JSON.parse(lockoutData);
    if (new Date(lockout.lockedUntil) <= new Date()) {
      await this.redis.del(KEYS.ACCOUNT_LOCKOUT + email.toLowerCase());
      return null;
    }

    return lockout;
  }

  // ==================== PASSWORD HISTORY ====================

  async addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
    const key = KEYS.PASSWORD_HISTORY + userId;

    // Push new hash to head of list
    await this.redis.lpush(key, passwordHash);

    // Trim to configured history count
    await this.redis.ltrim(key, 0, this.PASSWORD_HISTORY_COUNT - 1);
  }

  async isPasswordInHistory(userId: string, plainPassword: string): Promise<boolean> {
    const key = KEYS.PASSWORD_HISTORY + userId;
    const history = await this.redis.lrange(key, 0, -1);

    for (const oldHash of history) {
      const matches = await bcrypt.compare(plainPassword, oldHash);
      if (matches) {
        return true;
      }
    }

    return false;
  }

  async validatePasswordNotReused(
    userId: string,
    newPassword: string,
  ): Promise<{ valid: boolean; message?: string }> {
    const isReused = await this.isPasswordInHistory(userId, newPassword);

    if (isReused) {
      return {
        valid: false,
        message: `Cannot reuse any of your last ${this.PASSWORD_HISTORY_COUNT} passwords`,
      };
    }

    return { valid: true };
  }

  // ==================== TOKEN BLACKLIST ====================

  async blacklistToken(token: string, expiresAt?: Date): Promise<void> {
    const tokenHash = this.hashToken(token);

    // Default TTL: 24 hours (should cover access + refresh token lifetimes)
    const ttl = expiresAt
      ? Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
      : 86400;

    await this.redis.setex(KEYS.TOKEN_BLACKLIST + tokenHash, ttl, '1');

    this.logger.debug(`Token blacklisted: ${tokenHash.substring(0, 10)}...`);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const exists = await this.redis.exists(KEYS.TOKEN_BLACKLIST + tokenHash);
    return exists === 1;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Store a revocation timestamp — any tokens issued before this time are invalid
    const key = KEYS.USER_TOKENS + userId;
    await this.redis.setex(key, 86400 * 7, Date.now().toString()); // 7 day TTL

    await this.auditService.log({
      action: 'ALL_TOKENS_REVOKED',
      userId,
    });

    this.logger.log(`All tokens revoked for user: ${userId}`);
  }

  async getTokenRevocationTimestamp(userId: string): Promise<number | null> {
    const timestamp = await this.redis.get(KEYS.USER_TOKENS + userId);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ==================== STATS ====================

  async getSecurityStats(): Promise<{
    lockedAccounts: number;
    blacklistedTokens: number;
  }> {
    // Count locked accounts
    let lockedCount = 0;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        KEYS.ACCOUNT_LOCKOUT + '*',
        'COUNT',
        100,
      );
      cursor = nextCursor;
      lockedCount += keys.length;
    } while (cursor !== '0');

    // Count blacklisted tokens
    let blacklistCount = 0;
    cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        KEYS.TOKEN_BLACKLIST + '*',
        'COUNT',
        100,
      );
      cursor = nextCursor;
      blacklistCount += keys.length;
    } while (cursor !== '0');

    return {
      lockedAccounts: lockedCount,
      blacklistedTokens: blacklistCount,
    };
  }
}
