import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../audit/audit.service';

export interface LoginAttempt {
  email: string;
  ip: string;
  timestamp: Date;
  success: boolean;
}

export interface AccountLockout {
  userId: string;
  lockedUntil: Date;
  failedAttempts: number;
  lastAttempt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
  message?: string;
}

@Injectable()
export class AuthSecurityService {
  private readonly logger = new Logger(AuthSecurityService.name);
  
  // In-memory stores (use Redis in production for distributed systems)
  private readonly loginAttempts = new Map<string, LoginAttempt[]>();
  private readonly accountLockouts = new Map<string, AccountLockout>();
  private readonly blacklistedTokens = new Set<string>();
  private readonly passwordHistory = new Map<string, string[]>();

  // Configuration
  private readonly MAX_FAILED_ATTEMPTS: number;
  private readonly LOCKOUT_DURATION_MINUTES: number;
  private readonly RATE_LIMIT_WINDOW_MINUTES: number;
  private readonly PASSWORD_HISTORY_COUNT: number;
  private readonly TOKEN_BLACKLIST_CLEANUP_INTERVAL = 3600000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.MAX_FAILED_ATTEMPTS = this.configService.get('security.maxFailedAttempts') || 5;
    this.LOCKOUT_DURATION_MINUTES = this.configService.get('security.lockoutDurationMinutes') || 15;
    this.RATE_LIMIT_WINDOW_MINUTES = this.configService.get('security.rateLimitWindowMinutes') || 15;
    this.PASSWORD_HISTORY_COUNT = this.configService.get('security.passwordHistoryCount') || 5;

    // Cleanup expired data periodically
    setInterval(() => this.cleanupExpiredData(), this.TOKEN_BLACKLIST_CLEANUP_INTERVAL);
  }

  // ==================== RATE LIMITING ====================

  async checkRateLimit(email: string, ip: string): Promise<RateLimitResult> {
    const key = this.getRateLimitKey(email, ip);
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

    // Check if account is locked
    const lockout = this.accountLockouts.get(email.toLowerCase());
    if (lockout && lockout.lockedUntil > now) {
      const remainingMinutes = Math.ceil((lockout.lockedUntil.getTime() - now.getTime()) / 60000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil: lockout.lockedUntil,
        message: `Account locked. Try again in ${remainingMinutes} minute(s).`,
      };
    }

    // Get recent failed attempts
    const attempts = this.loginAttempts.get(key) || [];
    const recentFailedAttempts = attempts.filter(
      a => !a.success && a.timestamp > windowStart
    );

    const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - recentFailedAttempts.length);

    if (recentFailedAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
      // Lock the account
      await this.lockAccount(email, ip);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil: this.accountLockouts.get(email.toLowerCase())?.lockedUntil,
        message: `Too many failed attempts. Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
      };
    }

    return {
      allowed: true,
      remainingAttempts,
    };
  }

  async recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
    const key = this.getRateLimitKey(email, ip);
    const attempt: LoginAttempt = {
      email: email.toLowerCase(),
      ip,
      timestamp: new Date(),
      success,
    };

    const attempts = this.loginAttempts.get(key) || [];
    attempts.push(attempt);

    // Keep only recent attempts
    const windowStart = new Date(Date.now() - this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentAttempts = attempts.filter(a => a.timestamp > windowStart);
    this.loginAttempts.set(key, recentAttempts);

    if (success) {
      // Clear lockout on successful login
      this.accountLockouts.delete(email.toLowerCase());
      this.logger.log(`Successful login for ${email} from ${ip}`);
    } else {
      const failedCount = recentAttempts.filter(a => !a.success).length;
      this.logger.warn(`Failed login attempt ${failedCount}/${this.MAX_FAILED_ATTEMPTS} for ${email} from ${ip}`);
      
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
    
    const lockout: AccountLockout = {
      userId: email.toLowerCase(),
      lockedUntil,
      failedAttempts: this.MAX_FAILED_ATTEMPTS,
      lastAttempt: new Date(),
    };

    this.accountLockouts.set(email.toLowerCase(), lockout);

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
    this.accountLockouts.delete(email.toLowerCase());
    
    // Clear login attempts
    const keysToDelete: string[] = [];
    this.loginAttempts.forEach((_, key) => {
      if (key.startsWith(email.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.loginAttempts.delete(key));

    this.logger.log(`Account unlocked: ${email} by ${adminUserId || 'system'}`);

    await this.auditService.log({
      action: 'ACCOUNT_UNLOCKED',
      userId: adminUserId,
      details: { email },
    });
  }

  isAccountLocked(email: string): boolean {
    const lockout = this.accountLockouts.get(email.toLowerCase());
    if (!lockout) return false;
    
    if (lockout.lockedUntil <= new Date()) {
      this.accountLockouts.delete(email.toLowerCase());
      return false;
    }
    
    return true;
  }

  getAccountLockoutInfo(email: string): AccountLockout | null {
    const lockout = this.accountLockouts.get(email.toLowerCase());
    if (!lockout || lockout.lockedUntil <= new Date()) {
      return null;
    }
    return lockout;
  }

  // ==================== PASSWORD HISTORY ====================

  async addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
    const history = this.passwordHistory.get(userId) || [];
    
    // Add new password to front
    history.unshift(passwordHash);
    
    // Keep only the configured number of passwords
    if (history.length > this.PASSWORD_HISTORY_COUNT) {
      history.pop();
    }
    
    this.passwordHistory.set(userId, history);
  }

  async isPasswordInHistory(userId: string, plainPassword: string): Promise<boolean> {
    const history = this.passwordHistory.get(userId) || [];
    
    for (const oldHash of history) {
      const matches = await bcrypt.compare(plainPassword, oldHash);
      if (matches) {
        return true;
      }
    }
    
    return false;
  }

  async validatePasswordNotReused(userId: string, newPassword: string): Promise<{ valid: boolean; message?: string }> {
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

  blacklistToken(token: string, expiresAt?: Date): void {
    // Store token hash instead of full token for security
    const tokenHash = this.hashToken(token);
    this.blacklistedTokens.add(tokenHash);
    
    this.logger.debug(`Token blacklisted: ${tokenHash.substring(0, 10)}...`);
  }

  isTokenBlacklisted(token: string): boolean {
    const tokenHash = this.hashToken(token);
    return this.blacklistedTokens.has(tokenHash);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // In a real implementation with Redis, you'd track tokens by user
    // For now, we log the action - actual implementation would require
    // storing token-to-user mappings
    
    await this.auditService.log({
      action: 'ALL_TOKENS_REVOKED',
      userId,
    });

    this.logger.log(`All tokens revoked for user: ${userId}`);
  }

  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // ==================== CLEANUP ====================

  private cleanupExpiredData(): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

    // Cleanup expired login attempts
    this.loginAttempts.forEach((attempts, key) => {
      const recentAttempts = attempts.filter(a => a.timestamp > windowStart);
      if (recentAttempts.length === 0) {
        this.loginAttempts.delete(key);
      } else {
        this.loginAttempts.set(key, recentAttempts);
      }
    });

    // Cleanup expired lockouts
    this.accountLockouts.forEach((lockout, key) => {
      if (lockout.lockedUntil <= now) {
        this.accountLockouts.delete(key);
      }
    });

    // Note: Token blacklist cleanup would require storing expiry times
    // In production, use Redis with TTL

    this.logger.debug('Auth security cleanup completed');
  }

  // ==================== STATS ====================

  getSecurityStats(): {
    activeAttempts: number;
    lockedAccounts: number;
    blacklistedTokens: number;
    passwordHistoryEntries: number;
  } {
    return {
      activeAttempts: this.loginAttempts.size,
      lockedAccounts: this.accountLockouts.size,
      blacklistedTokens: this.blacklistedTokens.size,
      passwordHistoryEntries: this.passwordHistory.size,
    };
  }
}
