/**
 * ReshADX - Authentication Controller
 * Handles user authentication and authorization
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, tokens } = await authService.register({
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        middleName: req.body.middleName,
        phoneNumber: req.body.phoneNumber,
        country: req.body.country,
        dateOfBirth: req.body.dateOfBirth,
        referralCode: req.body.referralCode,
      });

      return res.status(201).json({
        success: true,
        data: {
          userId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        message: 'Registration successful. Please verify your email.',
      });
    } catch (error) {
      logger.error('Registration error', { error, email: req.body.email });

      const message = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = message.includes('already exists') ? 409 : 500;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 409 ? 'USER_EXISTS' : 'REGISTRATION_ERROR',
          message,
        },
      });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const metadata = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };

      const { user, tokens } = await authService.login(
        {
          email: req.body.email,
          password: req.body.password,
        },
        metadata
      );

      return res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            accountTier: user.account_tier,
            accountStatus: user.account_status,
            emailVerified: user.email_verified,
            phoneVerified: user.phone_verified,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        message: 'Login successful',
      });
    } catch (error) {
      logger.error('Login error', { error });

      const message = error instanceof Error ? error.message : 'Login failed';
      const statusCode = message.includes('Invalid credentials') || message.includes('locked') || message.includes('suspended') ? 401 : 500;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message,
        },
      });
    }
  }

  async loginWithPhone(req: Request, res: Response): Promise<Response> {
    try {
      const metadata = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };

      const { user, tokens } = await authService.login(
        {
          phoneNumber: req.body.phoneNumber,
          password: req.body.password,
        },
        metadata
      );

      return res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            accountTier: user.account_tier,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        message: 'Login successful',
      });
    } catch (error) {
      logger.error('Phone login error', { error });

      return res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: error instanceof Error ? error.message : 'Login failed',
        },
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      await authService.verifyEmail(req.body.token);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error', { error });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Email verification failed',
        },
      });
    }
  }

  async verifyPhone(req: Request, res: Response): Promise<Response> {
    try {
      await authService.verifyPhone(req.body.phoneNumber, req.body.otp);

      return res.status(200).json({
        success: true,
        message: 'Phone number verified successfully',
      });
    } catch (error) {
      logger.error('Phone verification error', { error });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Phone verification failed',
        },
      });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      await authService.forgotPassword(req.body.email);

      // Always return success to avoid email enumeration
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Forgot password error', { error });

      // Still return success to avoid email enumeration
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      await authService.resetPassword(req.body.token, req.body.password);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Reset password error', { error });

      return res.status(400).json({
        success: false,
        error: {
          code: 'RESET_ERROR',
          message: error instanceof Error ? error.message : 'Password reset failed',
        },
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);

      return res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      logger.error('Token refresh error', { error });

      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: 'Token refresh failed',
        },
      });
    }
  }

  async logout(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
      }

      const sessionId = req.headers['x-session-id'] as string;
      await authService.logout(req.user.userId, sessionId);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error', { error });

      return res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Logout failed',
        },
      });
    }
  }

  async getCurrentUser(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        });
      }

      // Fetch full user details from database
      const db = require('../database').default;
      const user = await db('users')
        .where({ user_id: req.user.userId })
        .whereNull('deleted_at')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      // Remove sensitive data
      delete user.password_hash;

      return res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            middleName: user.middle_name,
            phoneNumber: user.phone_number,
            dateOfBirth: user.date_of_birth,
            gender: user.gender,
            country: user.country,
            accountTier: user.account_tier,
            accountStatus: user.account_status,
            kycStatus: user.kyc_status,
            emailVerified: user.email_verified,
            phoneVerified: user.phone_verified,
            mfaEnabled: user.mfa_enabled,
            referralCode: user.referral_code,
            referralCount: user.referral_count,
            createdAt: user.created_at,
          },
        },
      });
    } catch (error) {
      logger.error('Get current user error', { error });

      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch user data',
        },
      });
    }
  }
}
