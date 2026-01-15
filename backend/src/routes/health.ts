/**
 * ReshADX - Health Check Routes
 * Kubernetes-compatible health and readiness endpoints
 */

import { Router, Request, Response } from 'express';
import db from '../database';
import { CacheService } from '../cache';

const router = Router();
const cache = new CacheService();

/**
 * Basic health check - always returns 200 if server is running
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

/**
 * Liveness probe - checks if the application is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - checks if the application is ready to serve traffic
 * Includes database and cache connectivity checks
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let isReady = true;

  // Check PostgreSQL
  try {
    const dbStart = Date.now();
    await db.raw('SELECT 1');
    checks.database = {
      status: 'connected',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    isReady = false;
    checks.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Redis
  try {
    const cacheStart = Date.now();
    await cache.ping();
    checks.cache = {
      status: 'connected',
      latency: Date.now() - cacheStart,
    };
  } catch (error) {
    isReady = false;
    checks.cache = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Return appropriate status
  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * Detailed health check with all service statuses
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    services: {},
  };

  // Check database
  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    health.services.database = {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    health.status = 'degraded';
    health.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check cache
  try {
    const start = Date.now();
    await cache.ping();
    health.services.cache = {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    health.status = 'degraded';
    health.services.cache = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export default router;
