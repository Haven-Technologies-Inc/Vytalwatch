/**
 * ReshADX TypeScript SDK - Error Classes
 */

export class ReshADXError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ReshADXError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReshADXError);
    }
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.code === 'INVALID_CREDENTIALS' ||
           this.code === 'INVALID_TOKEN' ||
           this.code === 'TOKEN_EXPIRED';
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.code === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  /**
   * Convert error to JSON
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends ReshADXError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ReshADXError {
  constructor(message: string, code: string = 'AUTHENTICATION_ERROR') {
    super(message, code, 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends ReshADXError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ReshADXError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends ReshADXError {
  constructor(message: string) {
    super(message, 'SERVER_ERROR', 500);
    this.name = 'ServerError';
  }
}
