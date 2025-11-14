/**
 * ReshADX - Admin Routes
 * Administrative and management endpoints
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get platform statistics
 * @access  Admin
 */
router.get('/stats', rateLimitAPI, adminController.getPlatformStats);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (paginated)
 * @access  Admin
 */
router.get(
  '/users',
  rateLimitAPI,
  [
    query('search').isString().optional(),
    query('status').isString().optional(),
    query('kycStatus').isString().optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
    query('offset').isInt({ min: 0 }).optional(),
  ],
  validateRequest,
  adminController.getUsers
);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get detailed user information
 * @access  Admin
 */
router.get(
  '/users/:userId',
  rateLimitAPI,
  [
    param('userId').isUUID(),
  ],
  validateRequest,
  adminController.getUserDetails
);

/**
 * @route   PATCH /api/v1/admin/users/:userId/status
 * @desc    Update user status (suspend, activate, etc.)
 * @access  Admin
 */
router.patch(
  '/users/:userId/status',
  rateLimitAPI,
  [
    param('userId').isUUID(),
    body('status').isIn(['ACTIVE', 'SUSPENDED', 'CLOSED']),
    body('reason').isString(),
  ],
  validateRequest,
  adminController.updateUserStatus
);

/**
 * @route   GET /api/v1/admin/risk/alerts
 * @desc    Get high-risk alerts for review
 * @access  Admin
 */
router.get(
  '/risk/alerts',
  rateLimitAPI,
  [
    query('riskLevel').isIn(['HIGH', 'CRITICAL']).optional(),
    query('status').isString().optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
  ],
  validateRequest,
  adminController.getRiskAlerts
);

/**
 * @route   POST /api/v1/admin/risk/:assessmentId/review
 * @desc    Review and resolve risk assessment
 * @access  Admin
 */
router.post(
  '/risk/:assessmentId/review',
  rateLimitAPI,
  [
    param('assessmentId').isUUID(),
    body('reviewStatus').isIn(['APPROVED', 'REJECTED', 'ESCALATED']),
    body('notes').isString(),
  ],
  validateRequest,
  adminController.reviewRiskAssessment
);

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs
 * @access  Admin
 */
router.get(
  '/audit-logs',
  rateLimitAPI,
  [
    query('userId').isUUID().optional(),
    query('action').isString().optional(),
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
  ],
  validateRequest,
  adminController.getAuditLogs
);

/**
 * @route   GET /api/v1/admin/institutions
 * @desc    Manage financial institutions
 * @access  Admin
 */
router.get('/institutions', rateLimitAPI, adminController.getInstitutions);

/**
 * @route   PATCH /api/v1/admin/institutions/:institutionId
 * @desc    Update institution details
 * @access  Admin
 */
router.patch(
  '/institutions/:institutionId',
  rateLimitAPI,
  [
    param('institutionId').isUUID(),
  ],
  validateRequest,
  adminController.updateInstitution
);

export default router;
