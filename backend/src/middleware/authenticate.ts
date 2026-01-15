/**
 * ReshADX - Authentication Middleware
 * Verifies JWT tokens and API keys
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import db from '../database';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
      apiKey?: {
        apiKeyId: string;
        userId: string;
        scopes: string[];
      };
    }
  }
}

/**
 * Middleware to authenticate user via JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header is required',
        },
        request_id: res.getHeader('X-Request-ID'),
      });
    }

    // Check if it's a Bearer token or API key
    if (authHeader.startsWith('Bearer ')) {
      // JWT Authentication
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as {
          userId: string;
          email: string;
          role: string;
        };

        // Attach user to request
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };

        // Log authentication
        logger.debug('User authenticated via JWT', {
          userId: decoded.userId,
          path: req.path,
        });

        next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Access token has expired',
            },
            request_id: res.getHeader('X-Request-ID'),
          });
        }

        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token',
          },
          request_id: res.getHeader('X-Request-ID'),
        });
      }
    } else if (authHeader.startsWith('rshx_')) {
      // API Key Authentication
      // Hash the incoming API key using SHA-256 for secure comparison
      const crypto = require('crypto');
      const apiKeyHash = crypto
        .createHash('sha256')
        .update(authHeader)
        .digest('hex');

      try {
        const apiKey = await db('api_keys')
          .where({ key_hash: apiKeyHash, status: 'ACTIVE' })
          .whereNull('deleted_at')
          .first();

        if (!apiKey) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_API_KEY',
              message: 'Invalid or inactive API key',
            },
            request_id: res.getHeader('X-Request-ID'),
          });
        }

        // Check expiration
        if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'API_KEY_EXPIRED',
              message: 'API key has expired',
            },
            request_id: res.getHeader('X-Request-ID'),
          });
        }

        // Update last used
        await db('api_keys')
          .where({ api_key_id: apiKey.api_key_id })
          .update({
            last_used_at: new Date(),
            last_used_ip: req.ip,
            total_requests: db.raw('total_requests + 1'),
          });

        // Attach API key info to request
        req.apiKey = {
          apiKeyId: apiKey.api_key_id,
          userId: apiKey.user_id,
          scopes: apiKey.scopes || [],
        };

        req.user = {
          userId: apiKey.user_id,
          email: '',
          role: 'API_KEY',
        };

        logger.debug('User authenticated via API key', {
          apiKeyId: apiKey.api_key_id,
          userId: apiKey.user_id,
          path: req.path,
        });

        next();
      } catch (error) {
        logger.error('API key authentication error', { error });
        return res.status(500).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication error occurred',
          },
          request_id: res.getHeader('X-Request-ID'),
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTHORIZATION_FORMAT',
          message: 'Authorization must be Bearer token or API key',
        },
        request_id: res.getHeader('X-Request-ID'),
      });
    }
  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'An error occurred during authentication',
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }
};

/**
 * Optional authentication middleware
 * Continues even if no auth is provided
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  // Try to authenticate, but don't fail if it doesn't work
  await authenticate(req, res, (err?: any) => {
    // Continue regardless of authentication result
    next();
  });
};
