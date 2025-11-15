/**
 * ReshADX - Auth Service Unit Tests
 */

import { AuthService } from '../../../src/services/auth.service';
import { EmailService } from '../../../src/services/email.service';
import { SmsService } from '../../../src/services/sms.service';
import db from '../../../src/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../src/database');
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/services/sms.service');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockSmsService: jest.Mocked<SmsService>;

  beforeEach(() => {
    authService = new AuthService();
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;
    mockSmsService = new SmsService() as jest.Mocked<SmsService>;
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+233201234567',
      };

      const mockUser = {
        user_id: 'user-123',
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone_number: userData.phoneNumber,
        referral_code: 'ABC123',
        account_tier: 'FREE',
        account_status: 'PENDING_VERIFICATION',
      };

      const mockTransaction = {
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser]),
        }),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      (db as any).transaction = jest.fn().mockResolvedValue(mockTransaction);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await authService.register(userData);

      expect(result).toHaveProperty('userId', mockUser.user_id);
      expect(result).toHaveProperty('tokens');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+233201234567',
      };

      const mockTransaction = {
        insert: jest.fn().mockRejectedValue(new Error('Database error')),
        rollback: jest.fn(),
      };

      (db as any).transaction = jest.fn().mockResolvedValue(mockTransaction);

      await expect(authService.register(userData)).rejects.toThrow('Database error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password',
      };

      const mockUser = {
        user_id: 'user-123',
        email: credentials.email,
        password_hash: 'hashedPassword',
        account_status: 'ACTIVE',
        failed_login_attempts: 0,
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue(1),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await authService.login(credentials, {});

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should fail login with invalid password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        user_id: 'user-123',
        email: credentials.email,
        password_hash: 'hashedPassword',
        failed_login_attempts: 0,
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(1),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(credentials, {})).rejects.toThrow('Invalid credentials');
    });

    it('should lock account after max failed attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        user_id: 'user-123',
        email: credentials.email,
        password_hash: 'hashedPassword',
        failed_login_attempts: 4, // One away from lock
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(1),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(credentials, {})).rejects.toThrow();

      // Verify account was locked
      expect((db as any)().update).toHaveBeenCalledWith(
        expect.objectContaining({
          account_status: 'LOCKED',
        })
      );
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'valid-token';
      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        account_status: 'PENDING_VERIFICATION',
      };

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: mockUser.user_id }),
        update: jest.fn().mockResolvedValue(1),
        delete: jest.fn().mockResolvedValue(1),
      });

      const result = await authService.verifyEmail(token);

      expect(result).toBe(true);
    });

    it('should fail verification with invalid token', async () => {
      const token = 'invalid-token';

      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.verifyEmail(token)).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockDecoded = {
        userId: 'user-123',
        type: 'refresh',
      };

      const mockUser = {
        user_id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      (db as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      });
      (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
    });

    it('should fail with invalid refresh token', async () => {
      const refreshToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow();
    });
  });
});
