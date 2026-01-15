/**
 * ReshADX - Error Handler Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

/**
 * Custom API Error class
 */
export class AppError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes mapping
 */
const errorCodes: Record<string, { statusCode: number; message: string }> = {
  VALIDATION_ERROR: { statusCode: 400, message: 'Validation failed' },
  UNAUTHORIZED: { statusCode: 401, message: 'Unauthorized' },
  FORBIDDEN: { statusCode: 403, message: 'Forbidden' },
  NOT_FOUND: { statusCode: 404, message: 'Resource not found' },
  CONFLICT: { statusCode: 409, message: 'Resource conflict' },
  RATE_LIMITED: { statusCode: 429, message: 'Too many requests' },
  INTERNAL_ERROR: { statusCode: 500, message: 'Internal server error' },
};

/**
 * Sanitize error message for production
 */
const sanitizeErrorMessage = (error: ApiError, isProduction: boolean): string => {
  if (!isProduction) {
    return error.message;
  }

  // Don't expose internal error details in production
  if (!error.isOperational) {
    return 'An unexpected error occurred';
  }

  // Remove sensitive information patterns
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /credential/gi,
    /authorization/gi,
  ];

  let message = error.message;
  sensitivePatterns.forEach((pattern) => {
    message = message.replace(pattern, '[REDACTED]');
  });

  return message;
};

/**
 * Main error handler middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Default error values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  }

  // Sanitize message for production
  const sanitizedMessage = sanitizeErrorMessage(
    { ...err, message },
    isProduction
  );

  // Log error
  const logData = {
    code,
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    requestId: res.getHeader('X-Request-ID'),
    ...(isProduction ? {} : { stack: err.stack }),
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  }

  // Build response
  const response: any = {
    success: false,
    error: {
      code,
      message: sanitizedMessage,
    },
    request_id: res.getHeader('X-Request-ID'),
  };

  // Include details in non-production
  if (!isProduction && err.details) {
    response.error.details = err.details;
  }

  // Include stack trace in development
  if (!isProduction) {
    response.error.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Not found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    request_id: res.getHeader('X-Request-ID'),
  });
};

/**
 * Async handler wrapper to catch async errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
