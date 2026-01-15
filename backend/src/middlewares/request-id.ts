/**
 * ReshADX - Request ID Middleware
 * Assigns unique request IDs for tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Request ID middleware
 * Generates or uses existing request ID for tracing
 */
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use existing header or generate new ID
  const id = (req.headers['x-request-id'] as string) || uuidv4();

  // Attach to request
  req.id = id;

  // Set response header
  res.setHeader('X-Request-ID', id);

  next();
};

export default requestId;
