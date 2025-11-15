/**
 * ReshADX - Request Validation Middleware
 * Validates request data using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to validate request using express-validator
 * Returns 400 with validation errors if validation fails
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: 'param' in error ? error.param : 'unknown',
      message: error.msg,
      value: 'param' in error && 'value' in error ? error.value : undefined,
    }));

    logger.warn('Request validation failed', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errorMessages,
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }

  next();
};
