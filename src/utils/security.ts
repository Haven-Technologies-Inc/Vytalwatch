// ReshADX Security Utilities
// Encryption, authentication, and security best practices

import crypto from 'crypto';

// ============================================================================
// ENCRYPTION
// ============================================================================

export class Encryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;

  /**
   * Encrypt sensitive data (PII, credentials, etc.)
   */
  static encrypt(plaintext: string, masterKey: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const salt = crypto.randomBytes(this.SALT_LENGTH);

    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, this.KEY_LENGTH, 'sha512');

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return: salt + iv + tag + encrypted
    return salt.toString('hex') + iv.toString('hex') + tag.toString('hex') + encrypted;
  }

  /**
   * Decrypt encrypted data
   */
  static decrypt(encryptedData: string, masterKey: string): string {
    const saltHex = encryptedData.slice(0, this.SALT_LENGTH * 2);
    const ivHex = encryptedData.slice(this.SALT_LENGTH * 2, this.SALT_LENGTH * 2 + this.IV_LENGTH * 2);
    const tagHex = encryptedData.slice(
      this.SALT_LENGTH * 2 + this.IV_LENGTH * 2,
      this.SALT_LENGTH * 2 + this.IV_LENGTH * 2 + this.TAG_LENGTH * 2
    );
    const encrypted = encryptedData.slice(this.SALT_LENGTH * 2 + this.IV_LENGTH * 2 + this.TAG_LENGTH * 2);

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, this.KEY_LENGTH, 'sha512');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash passwords securely
   */
  static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  /**
   * Verify password hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }

  /**
   * Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data for checksums/fingerprints
   */
  static hash(data: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

export class JWTManager {
  /**
   * Create JWT token
   */
  static createToken(payload: object, secret: string, expiresIn: string = '1h'): string {
    // In production, use a proper JWT library like jsonwebtoken
    // This is a simplified example
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = this.parseExpiresIn(expiresIn);

    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string, secret: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Parse expiresIn string to seconds
   */
  private static parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export class APIKeyManager {
  /**
   * Generate API key pair (public + secret)
   */
  static generateKeyPair(environment: 'test' | 'live'): {
    publicKey: string;
    secretKey: string;
  } {
    const prefix = environment === 'test' ? 'test' : 'live';
    const publicKey = `${prefix}_pk_${Encryption.generateToken(16)}`;
    const secretKey = `${prefix}_sk_${Encryption.generateToken(24)}`;

    return { publicKey, secretKey };
  }

  /**
   * Validate API key format
   */
  static isValidFormat(key: string): boolean {
    const pattern = /^(test|live)_(pk|sk)_[a-f0-9]{32,48}$/;
    return pattern.test(key);
  }

  /**
   * Extract environment from API key
   */
  static getEnvironment(key: string): 'test' | 'live' | null {
    if (key.startsWith('test_')) return 'test';
    if (key.startsWith('live_')) return 'live';
    return null;
  }

  /**
   * Is secret key
   */
  static isSecretKey(key: string): boolean {
    return key.includes('_sk_');
  }

  /**
   * Is publishable key
   */
  static isPublishableKey(key: string): boolean {
    return key.includes('_pk_');
  }
}

// ============================================================================
// PII MASKING
// ============================================================================

export class PIIMasker {
  /**
   * Mask phone number
   */
  static maskPhone(phone: string): string {
    if (phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
  }

  /**
   * Mask email
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;

    const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : local;

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask credit card
   */
  static maskCard(card: string): string {
    if (card.length < 4) return '****';
    return '*'.repeat(card.length - 4) + card.slice(-4);
  }

  /**
   * Mask national ID
   */
  static maskNationalId(id: string): string {
    if (id.length < 4) return '****';
    return id.slice(0, 3) + '*'.repeat(id.length - 6) + id.slice(-3);
  }

  /**
   * Mask account number
   */
  static maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length < 4) return '****';
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export class RateLimiter {
  private static requests = new Map<string, { count: number; resetAt: number }>();

  /**
   * Check if request is allowed
   */
  static isAllowed(identifier: string, maxRequests: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now >= record.resetAt) {
      // New window
      this.requests.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    // Increment and allow
    record.count++;

    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  static reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

export class InputValidator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number (African formats)
   */
  static isValidPhone(phone: string): boolean {
    // Support formats: +233501234567, 0501234567, 501234567
    const phoneRegex = /^(\+?233|0)?[2-5][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Sanitize string (prevent XSS)
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate amount
   */
  static isValidAmount(amount: number): boolean {
    return typeof amount === 'number' && amount > 0 && amount < 1000000000 && !isNaN(amount);
  }

  /**
   * Validate currency code
   */
  static isValidCurrency(currency: string): boolean {
    const validCurrencies = ['GHS', 'NGN', 'KES', 'UGX', 'TZS', 'ZAR', 'USD', 'EUR', 'GBP'];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validate UUID
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

export class WebhookSecurity {
  /**
   * Generate webhook signature
   */
  static generateSignature(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string,
    toleranceSeconds: number = 300
  ): boolean {
    // Parse signature
    const parts = signature.split(',');
    const timestamp = parseInt(parts[0].split('=')[1]);
    const receivedSignature = parts[1].split('=')[1];

    // Check timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
  }
}

// ============================================================================
// SECURE RANDOM GENERATORS
// ============================================================================

export class SecureRandom {
  /**
   * Generate OTP code
   */
  static generateOTP(length: number = 6): string {
    const max = Math.pow(10, length);
    const otp = crypto.randomInt(0, max);
    return otp.toString().padStart(length, '0');
  }

  /**
   * Generate reference number
   */
  static generateReference(prefix: string = 'REF'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return `sess_${crypto.randomBytes(24).toString('hex')}`;
  }
}

// ============================================================================
// COMPLIANCE UTILITIES
// ============================================================================

export class ComplianceUtils {
  /**
   * Check if amount requires reporting (CTR/SAR)
   */
  static requiresReporting(amount: number, currency: string): {
    ctr: boolean; // Currency Transaction Report
    sar: boolean; // Suspicious Activity Report
  } {
    // CTR thresholds by country
    const ctrThresholds: Record<string, number> = {
      GHS: 30000, // Ghana: GHS 30,000
      NGN: 5000000, // Nigeria: NGN 5,000,000
      KES: 1000000, // Kenya: KES 1,000,000
      USD: 10000, // International: USD 10,000
    };

    const threshold = ctrThresholds[currency] || 10000;

    return {
      ctr: amount >= threshold,
      sar: false, // SAR triggered by other risk factors
    };
  }

  /**
   * Redact PII for logging
   */
  static redactForLogs(data: any): any {
    const redacted = { ...data };

    // List of fields to redact
    const piiFields = [
      'password',
      'pin',
      'secret',
      'token',
      'ssn',
      'national_id',
      'credit_card',
      'cvv',
      'account_number',
    ];

    for (const field of piiFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }

    return redacted;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const security = {
  Encryption,
  JWTManager,
  APIKeyManager,
  PIIMasker,
  RateLimiter,
  InputValidator,
  WebhookSecurity,
  SecureRandom,
  ComplianceUtils,
};

export default security;
