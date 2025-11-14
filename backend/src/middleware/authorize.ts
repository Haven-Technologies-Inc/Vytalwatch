/**
 * ReshADX - Authorization Middleware
 * Checks user roles and permissions
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to check if user has required role
 * @param allowedRoles - Array of roles that can access the resource
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        request_id: res.getHeader('X-Request-ID'),
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        role: userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
        request_id: res.getHeader('X-Request-ID'),
      });
    }

    logger.debug('Authorization successful', {
      userId: req.user.userId,
      role: userRole,
      path: req.path,
    });

    next();
  };
};

/**
 * Middleware to check if user has required scope (for API keys)
 * @param requiredScopes - Array of scopes required to access the resource
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.apiKey) {
      // If not using API key, skip scope check
      return next();
    }

    const userScopes = req.apiKey.scopes || [];

    const hasRequiredScopes = requiredScopes.every((scope) =>
      userScopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      logger.warn('Scope authorization failed', {
        apiKeyId: req.apiKey.apiKeyId,
        userScopes,
        requiredScopes,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: `Missing required scopes: ${requiredScopes.join(', ')}`,
          requiredScopes,
          userScopes,
        },
        request_id: res.getHeader('X-Request-ID'),
      });
    }

    next();
  };
};
