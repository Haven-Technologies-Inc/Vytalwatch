/**
 * ReshADX - Admin Controller (COMPLETE IMPLEMENTATION)
 * Platform administration and management endpoints
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import db from '../database';

export class AdminController {
  /**
   * Get platform statistics
   * GET /api/v1/admin/stats
   */
  async getPlatformStats(req: Request, res: Response): Promise<Response> {
    try {
      const timeRange = (req.query.timeRange as string) || '30d';

      // Calculate date range
      const startDate = this.calculateStartDate(timeRange);

      // Get user stats
      const totalUsers = await db('users').count('* as count').first();
      const activeUsers = await db('users')
        .where('account_status', 'ACTIVE')
        .count('* as count')
        .first();
      const newUsers = await db('users')
        .where('created_at', '>=', startDate)
        .count('* as count')
        .first();

      // Get transaction stats
      const totalTransactions = await db('transactions')
        .where('date', '>=', startDate)
        .count('* as count')
        .first();
      const transactionVolume = await db('transactions')
        .where('date', '>=', startDate)
        .sum('amount as total')
        .first();

      // Get item stats
      const totalItems = await db('items').whereNull('deleted_at').count('* as count').first();
      const activeItems = await db('items')
        .where('status', 'ACTIVE')
        .whereNull('deleted_at')
        .count('* as count')
        .first();

      // Get institution stats
      const totalInstitutions = await db('institutions').count('* as count').first();
      const activeInstitutions = await db('institutions')
        .where('status', 'ACTIVE')
        .count('* as count')
        .first();

      // Get risk stats
      const highRiskAlerts = await db('fraud_alerts')
        .whereIn('risk_level', ['HIGH', 'CRITICAL'])
        .where('status', 'PENDING')
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          users: {
            total: parseInt(totalUsers?.count as string || '0'),
            active: parseInt(activeUsers?.count as string || '0'),
            new: parseInt(newUsers?.count as string || '0'),
          },
          transactions: {
            count: parseInt(totalTransactions?.count as string || '0'),
            volume: (transactionVolume?.total || 0) / 100, // Convert to GHS
          },
          items: {
            total: parseInt(totalItems?.count as string || '0'),
            active: parseInt(activeItems?.count as string || '0'),
          },
          institutions: {
            total: parseInt(totalInstitutions?.count as string || '0'),
            active: parseInt(activeInstitutions?.count as string || '0'),
          },
          risk: {
            highRiskAlerts: parseInt(highRiskAlerts?.count as string || '0'),
          },
          timeRange,
        },
      });
    } catch (error) {
      logger.error('Get platform stats error', { error });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch platform statistics',
        },
      });
    }
  }

  /**
   * Get all users (admin only)
   * GET /api/v1/admin/users
   */
  async getUsers(req: Request, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const search = req.query.search as string;

      let query = db('users').whereNull('deleted_at');

      if (status) {
        query = query.where({ account_status: status });
      }

      if (search) {
        query = query.where((builder) => {
          builder
            .where('email', 'ilike', `%${search}%`)
            .orWhere('first_name', 'ilike', `%${search}%`)
            .orWhere('last_name', 'ilike', `%${search}%`);
        });
      }

      const users = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select('user_id', 'email', 'first_name', 'last_name', 'account_status', 'account_tier', 'created_at', 'last_login_at');

      const total = await db('users')
        .whereNull('deleted_at')
        .modify((qb) => {
          if (status) qb.where({ account_status: status });
          if (search) {
            qb.where((builder) => {
              builder
                .where('email', 'ilike', `%${search}%`)
                .orWhere('first_name', 'ilike', `%${search}%`)
                .orWhere('last_name', 'ilike', `%${search}%`);
            });
          }
        })
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            total: parseInt(total?.count as string || '0'),
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      logger.error('Get users error', { error });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch users',
        },
      });
    }
  }

  /**
   * Get user details (admin only)
   * GET /api/v1/admin/users/:userId
   */
  async getUserDetails(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      const user = await db('users')
        .where({ user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      // Get user's items
      const items = await db('items')
        .where({ user_id: userId })
        .whereNull('deleted_at')
        .count('* as count')
        .first();

      // Get user's transactions
      const transactions = await db('transactions')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      // Get user's risk score
      const latestRisk = await db('fraud_checks')
        .where({ user_id: userId })
        .orderBy('checked_at', 'desc')
        .first();

      // Remove sensitive data
      delete user.password_hash;

      return res.status(200).json({
        success: true,
        data: {
          user: {
            ...user,
            stats: {
              itemCount: parseInt(items?.count as string || '0'),
              transactionCount: parseInt(transactions?.count as string || '0'),
              latestRiskScore: latestRisk?.risk_score || null,
              latestRiskLevel: latestRisk?.risk_level || null,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Get user details error', { error, userId: req.params.userId });
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }
  }

  /**
   * Update user status (admin only)
   * PATCH /api/v1/admin/users/:userId/status
   */
  async updateUserStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status',
          },
        });
      }

      await db('users')
        .where({ user_id: userId })
        .update({
          account_status: status,
          updated_at: new Date(),
        });

      // Log the action
      await db('audit_logs').insert({
        user_id: userId,
        action: 'USER_STATUS_UPDATED',
        performed_by: req.user!.userId,
        details: JSON.stringify({ status, reason }),
        created_at: new Date(),
      });

      logger.info('User status updated', { userId, status, by: req.user!.userId });

      return res.status(200).json({
        success: true,
        message: 'User status updated successfully',
      });
    } catch (error) {
      logger.error('Update user status error', { error, userId: req.params.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update user status',
        },
      });
    }
  }

  /**
   * Get risk alerts (admin only)
   * GET /api/v1/admin/risk/alerts
   */
  async getRiskAlerts(req: Request, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const riskLevel = req.query.riskLevel as string;
      const status = req.query.status as string;

      let query = db('fraud_alerts as fa')
        .join('users as u', 'fa.user_id', 'u.user_id')
        .orderBy('fa.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (riskLevel) {
        query = query.where({ 'fa.risk_level': riskLevel });
      }

      if (status) {
        query = query.where({ 'fa.status': status });
      }

      const alerts = await query.select(
        'fa.*',
        'u.email',
        'u.first_name',
        'u.last_name'
      );

      const total = await db('fraud_alerts')
        .modify((qb) => {
          if (riskLevel) qb.where({ risk_level: riskLevel });
          if (status) qb.where({ status });
        })
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          alerts: alerts.map(a => ({
            id: a.id,
            userId: a.user_id,
            userEmail: a.email,
            userName: `${a.first_name} ${a.last_name}`,
            riskScore: a.risk_score,
            riskLevel: a.risk_level,
            decision: a.decision,
            flags: JSON.parse(a.flags || '[]'),
            status: a.status,
            createdAt: a.created_at,
            resolvedAt: a.resolved_at,
          })),
          pagination: {
            total: parseInt(total?.count as string || '0'),
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      logger.error('Get risk alerts error', { error });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch risk alerts',
        },
      });
    }
  }

  /**
   * Get audit logs (admin only)
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req: Request, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const action = req.query.action as string;
      const userId = req.query.userId as string;

      let query = db('audit_logs')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (action) {
        query = query.where({ action });
      }

      if (userId) {
        query = query.where({ user_id: userId });
      }

      const logs = await query;

      const total = await db('audit_logs')
        .modify((qb) => {
          if (action) qb.where({ action });
          if (userId) qb.where({ user_id: userId });
        })
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          logs: logs.map(log => ({
            id: log.id,
            userId: log.user_id,
            action: log.action,
            performedBy: log.performed_by,
            details: log.details ? JSON.parse(log.details) : null,
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            createdAt: log.created_at,
          })),
          pagination: {
            total: parseInt(total?.count as string || '0'),
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      logger.error('Get audit logs error', { error });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch audit logs',
        },
      });
    }
  }

  /**
   * Get institutions (admin only)
   * GET /api/v1/admin/institutions
   */
  async getInstitutions(req: Request, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const country = req.query.country as string;

      let query = db('institutions').orderBy('name', 'asc').limit(limit).offset(offset);

      if (status) {
        query = query.where({ status });
      }

      if (country) {
        query = query.where({ country });
      }

      const institutions = await query;

      const total = await db('institutions')
        .modify((qb) => {
          if (status) qb.where({ status });
          if (country) qb.where({ country });
        })
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          institutions,
          pagination: {
            total: parseInt(total?.count as string || '0'),
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      logger.error('Get institutions error', { error });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch institutions',
        },
      });
    }
  }

  /**
   * Update institution (admin only)
   * PATCH /api/v1/admin/institutions/:institutionId
   */
  async updateInstitution(req: Request, res: Response): Promise<Response> {
    try {
      const { institutionId } = req.params;
      const updates = req.body;

      // Allowed fields to update
      const allowedFields = ['name', 'status', 'integration_type', 'oauth_config', 'ussd_code', 'logo_url'];
      const filteredUpdates: any = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      filteredUpdates.updated_at = new Date();

      await db('institutions')
        .where({ institution_id: institutionId })
        .update(filteredUpdates);

      // Log the action
      await db('audit_logs').insert({
        action: 'INSTITUTION_UPDATED',
        performed_by: req.user!.userId,
        details: JSON.stringify({ institutionId, updates: filteredUpdates }),
        created_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: 'Institution updated successfully',
      });
    } catch (error) {
      logger.error('Update institution error', { error, institutionId: req.params.institutionId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update institution',
        },
      });
    }
  }

  /**
   * Calculate start date based on time range
   */
  private calculateStartDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
