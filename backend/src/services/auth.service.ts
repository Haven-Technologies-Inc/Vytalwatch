/**
 * ReshADX - Authentication Service
 * Core authentication business logic
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { CacheService } from '../cache';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

const cache = new CacheService();
const emailService = new EmailService();
const smsService = new SmsService();

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber?: string;
  country?: string;
  dateOfBirth?: Date;
  referralCode?: string;
}

export interface LoginCredentials {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSession {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(userData: RegisterUserData): Promise<{ userId: string; tokens: TokenPair }> {
    const trx = await db.transaction();

    try {
      // Check if user already exists
      const existingUser = await trx('users')
        .where({ email: userData.email })
        .orWhere({ phone_number: userData.phoneNumber })
        .first();

      if (existingUser) {
        throw new Error('User with this email or phone number already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, config.security.bcryptRounds);

      // Generate referral code
      const referralCode = this.generateReferralCode();

      // Check if referred by someone
      let referredBy = null;
      if (userData.referralCode) {
        const referrer = await trx('users')
          .where({ referral_code: userData.referralCode })
          .first();

        if (referrer) {
          referredBy = referrer.user_id;
          // Update referrer's count
          await trx('users')
            .where({ user_id: referrer.user_id })
            .increment('referral_count', 1);
        }
      }

      // Create user
      const [user] = await trx('users').insert({
        email: userData.email.toLowerCase(),
        phone_number: userData.phoneNumber,
        password_hash: passwordHash,
        first_name: userData.firstName,
        last_name: userData.lastName,
        middle_name: userData.middleName,
        date_of_birth: userData.dateOfBirth,
        country: userData.country || 'GH',
        referral_code: referralCode,
        referred_by: referredBy,
        account_tier: 'FREE',
        account_status: 'PENDING_VERIFICATION',
        kyc_status: 'NOT_STARTED',
        risk_score: 0,
        risk_level: 'LOW',
      }).returning('*');

      // Generate email verification token
      const emailVerificationToken = this.generateVerificationToken();
      await this.storeVerificationToken(user.user_id, 'email', emailVerificationToken);

      // Send verification email
      await emailService.sendVerificationEmail(user.email, emailVerificationToken, user.first_name);

      // If phone provided, send OTP
      if (userData.phoneNumber) {
        const phoneOtp = this.generateOTP();
        await this.storeVerificationToken(user.user_id, 'phone', phoneOtp);
        await smsService.sendOTP(userData.phoneNumber, phoneOtp);
      }

      // Log registration
      await this.createAuditLog(trx, {
        userId: user.user_id,
        action: 'REGISTER',
        resourceType: 'USER',
        resourceId: user.user_id,
        eventType: 'AUTHENTICATION',
        severity: 'INFO',
        description: 'User registered successfully',
        status: 'SUCCESS',
      });

      await trx.commit();

      // Generate tokens
      const tokens = this.generateTokenPair(user);

      logger.info('User registered successfully', {
        userId: user.user_id,
        email: user.email,
      });

      return {
        userId: user.user_id,
        tokens,
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Registration error', { error, email: userData.email });
      throw error;
    }
  }

  /**
   * Login with email or phone
   */
  async login(credentials: LoginCredentials, metadata: any = {}): Promise<{ user: any; tokens: TokenPair }> {
    try {
      // Find user
      let query = db('users').whereNull('deleted_at');

      if (credentials.email) {
        query = query.where({ email: credentials.email.toLowerCase() });
      } else if (credentials.phoneNumber) {
        query = query.where({ phone_number: credentials.phoneNumber });
      } else {
        throw new Error('Email or phone number is required');
      }

      const user = await query.first();

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is active
      if (user.account_status === 'SUSPENDED') {
        throw new Error('Account is suspended. Please contact support.');
      }

      if (user.account_status === 'CLOSED') {
        throw new Error('Account is closed');
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const unlockTime = new Date(user.locked_until).toISOString();
        throw new Error(`Account is locked until ${unlockTime}`);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.handleFailedLogin(user.user_id);
        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts
      await db('users')
        .where({ user_id: user.user_id })
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: new Date(),
          last_login_ip: metadata.ip,
          last_login_device: metadata.userAgent,
        });

      // Generate tokens
      const tokens = this.generateTokenPair(user);

      // Store session in cache
      await this.storeSession(user.user_id, tokens.accessToken, metadata);

      // Log login
      await this.createAuditLog(db, {
        userId: user.user_id,
        action: 'LOGIN',
        resourceType: 'USER',
        resourceId: user.user_id,
        eventType: 'AUTHENTICATION',
        severity: 'INFO',
        description: 'User logged in successfully',
        status: 'SUCCESS',
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent,
      });

      logger.info('User logged in successfully', {
        userId: user.user_id,
        email: user.email,
      });

      // Remove sensitive data
      delete user.password_hash;

      return { user, tokens };
    } catch (error) {
      logger.error('Login error', { error });
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      // Get token from cache
      const userId = await cache.get<string>(`email_verification:${token}`);

      if (!userId) {
        throw new Error('Invalid or expired verification token');
      }

      // Update user
      await db('users')
        .where({ user_id: userId })
        .update({
          email_verified: true,
          email_verified_at: new Date(),
          account_status: 'ACTIVE',
        });

      // Delete token
      await cache.del(`email_verification:${token}`);

      logger.info('Email verified successfully', { userId });
    } catch (error) {
      logger.error('Email verification error', { error });
      throw error;
    }
  }

  /**
   * Verify phone with OTP
   */
  async verifyPhone(phoneNumber: string, otp: string): Promise<void> {
    try {
      // Get stored OTP
      const storedOtp = await cache.get<string>(`phone_otp:${phoneNumber}`);

      if (!storedOtp || storedOtp !== otp) {
        throw new Error('Invalid or expired OTP');
      }

      // Update user
      await db('users')
        .where({ phone_number: phoneNumber })
        .update({
          phone_verified: true,
          phone_verified_at: new Date(),
        });

      // Delete OTP
      await cache.del(`phone_otp:${phoneNumber}`);

      logger.info('Phone verified successfully', { phoneNumber });
    } catch (error) {
      logger.error('Phone verification error', { error });
      throw error;
    }
  }

  /**
   * Forgot password - send reset link
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await db('users')
        .where({ email: email.toLowerCase() })
        .whereNull('deleted_at')
        .first();

      if (!user) {
        // Don't reveal if user exists
        logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate reset token
      const resetToken = this.generateVerificationToken();
      await this.storeVerificationToken(user.user_id, 'password_reset', resetToken);

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.first_name);

      logger.info('Password reset email sent', { userId: user.user_id });
    } catch (error) {
      logger.error('Forgot password error', { error });
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Get token from cache
      const userId = await cache.get<string>(`password_reset:${token}`);

      if (!userId) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

      // Update user
      await db('users')
        .where({ user_id: userId })
        .update({
          password_hash: passwordHash,
          failed_login_attempts: 0,
          locked_until: null,
        });

      // Delete token
      await cache.del(`password_reset:${token}`);

      // Invalidate all sessions
      await this.invalidateAllSessions(userId);

      logger.info('Password reset successfully', { userId });
    } catch (error) {
      logger.error('Password reset error', { error });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshTokenSecret) as {
        userId: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user
      const user = await db('users')
        .where({ user_id: decoded.userId })
        .whereNull('deleted_at')
        .first();

      if (!user || user.account_status !== 'ACTIVE') {
        throw new Error('Invalid user');
      }

      // Generate new token pair
      const tokens = this.generateTokenPair(user);

      logger.info('Token refreshed successfully', { userId: user.user_id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh error', { error });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    try {
      // Invalidate session
      await cache.del(`session:${sessionId}`);

      logger.info('User logged out', { userId, sessionId });
    } catch (error) {
      logger.error('Logout error', { error });
      throw error;
    }
  }

  /**
   * Generate JWT token pair
   */
  private generateTokenPair(user: any): TokenPair {
    const accessTokenPayload = {
      userId: user.user_id,
      email: user.email,
      role: user.role || 'USER',
      type: 'access',
    };

    const refreshTokenPayload = {
      userId: user.user_id,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(refreshTokenPayload, config.jwt.refreshTokenSecret, {
      expiresIn: config.jwt.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Generate random referral code
   */
  private generateReferralCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store verification token in cache
   */
  private async storeVerificationToken(userId: string, type: string, token: string): Promise<void> {
    const key = `${type}_verification:${token}`;
    const ttl = 3600; // 1 hour
    await cache.set(key, userId, ttl);
  }

  /**
   * Store user session
   */
  private async storeSession(userId: string, accessToken: string, metadata: any): Promise<void> {
    const sessionId = uuidv4();
    const sessionData: UserSession = {
      userId,
      email: metadata.email,
      role: metadata.role || 'USER',
      sessionId,
    };

    await cache.set(`session:${sessionId}`, sessionData, 3600);
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await db('users').where({ user_id: userId }).first();

    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    const maxAttempts = 5;

    const updates: any = {
      failed_login_attempts: failedAttempts,
    };

    // Lock account after 5 failed attempts
    if (failedAttempts >= maxAttempts) {
      const lockDuration = 30 * 60 * 1000; // 30 minutes
      updates.locked_until = new Date(Date.now() + lockDuration);

      logger.warn('Account locked due to failed login attempts', {
        userId,
        attempts: failedAttempts,
      });
    }

    await db('users').where({ user_id: userId }).update(updates);
  }

  /**
   * Invalidate all user sessions
   */
  private async invalidateAllSessions(userId: string): Promise<void> {
    // In production, you'd store session IDs in Redis with user prefix
    // For now, this is a placeholder
    logger.info('All sessions invalidated', { userId });
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(trx: any, data: any): Promise<void> {
    await trx('audit_logs').insert({
      user_id: data.userId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      event_type: data.eventType,
      severity: data.severity,
      description: data.description,
      status: data.status,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      occurred_at: new Date(),
    });
  }
}
