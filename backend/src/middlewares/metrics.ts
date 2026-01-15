/**
 * ReshADX - Metrics Middleware
 * Collects request/response metrics
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Metrics storage (in production, use Prometheus/StatsD)
 */
interface RequestMetrics {
  totalRequests: number;
  requestsByMethod: Record<string, number>;
  requestsByPath: Record<string, number>;
  requestsByStatus: Record<string, number>;
  averageResponseTime: number;
  totalResponseTime: number;
}

const metrics: RequestMetrics = {
  totalRequests: 0,
  requestsByMethod: {},
  requestsByPath: {},
  requestsByStatus: {},
  averageResponseTime: 0,
  totalResponseTime: 0,
};

/**
 * Get current metrics
 */
export const getMetrics = (): RequestMetrics => ({
  ...metrics,
  averageResponseTime:
    metrics.totalRequests > 0
      ? Math.round(metrics.totalResponseTime / metrics.totalRequests)
      : 0,
});

/**
 * Reset metrics
 */
export const resetMetrics = (): void => {
  metrics.totalRequests = 0;
  metrics.requestsByMethod = {};
  metrics.requestsByPath = {};
  metrics.requestsByStatus = {};
  metrics.averageResponseTime = 0;
  metrics.totalResponseTime = 0;
};

/**
 * Metrics middleware
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Increment total requests
  metrics.totalRequests++;

  // Track by method
  const method = req.method;
  metrics.requestsByMethod[method] = (metrics.requestsByMethod[method] || 0) + 1;

  // Normalize path for metrics (remove IDs)
  const normalizedPath = req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Track response time
    metrics.totalResponseTime += duration;

    // Track by path
    metrics.requestsByPath[normalizedPath] = (metrics.requestsByPath[normalizedPath] || 0) + 1;

    // Track by status
    const statusGroup = `${Math.floor(res.statusCode / 100)}xx`;
    metrics.requestsByStatus[statusGroup] = (metrics.requestsByStatus[statusGroup] || 0) + 1;

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
        requestId: req.id,
      });
    }

    // Add response time header
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
};

/**
 * Metrics endpoint handler
 */
export const metricsHandler = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: getMetrics(),
    timestamp: new Date().toISOString(),
  });
};

export default metricsMiddleware;
