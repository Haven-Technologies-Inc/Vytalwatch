/**
 * ReshADX - Authentication Routes
 * User authentication and authorization endpoints
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate-request';
import { rateLimitAuth } from '../middleware/rate-limit';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  rateLimitAuth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('phoneNumber').isMobilePhone('any').optional(),
    body('country').isISO31661Alpha2().optional(),
  ],
  validateRequest,
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  rateLimitAuth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validateRequest,
  authController.login
);

/**
 * @route   POST /api/v1/auth/login/phone
 * @desc    Login with phone number (African markets)
 * @access  Public
 */
router.post(
  '/login/phone',
  rateLimitAuth,
  [
    body('phoneNumber').isMobilePhone('any'),
    body('password').notEmpty(),
  ],
  validateRequest,
  authController.loginWithPhone
);

/**
 * @route   POST /api/v1/auth/verify/email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify/email',
  [
    body('token').notEmpty(),
  ],
  validateRequest,
  authController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/verify/phone
 * @desc    Verify phone number with OTP
 * @access  Public
 */
router.post(
  '/verify/phone',
  rateLimitAuth,
  [
    body('phoneNumber').isMobilePhone('any'),
    body('otp').isLength({ min: 6, max: 6 }),
  ],
  validateRequest,
  authController.verifyPhone
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  rateLimitAuth,
  [
    body('email').isEmail().normalizeEmail(),
  ],
  validateRequest,
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  rateLimitAuth,
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  validateRequest,
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty(),
  ],
  validateRequest,
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authController.getCurrentUser);

export default router;
