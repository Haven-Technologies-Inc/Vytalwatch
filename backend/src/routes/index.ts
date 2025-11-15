/**
 * ReshADX - API Routes Index
 * Central routing configuration
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import linkRoutes from './link.routes';
import itemRoutes from './item.routes';
import accountRoutes from './account.routes';
import transactionRoutes from './transaction.routes';
import creditScoreRoutes from './credit-score.routes';
import riskRoutes from './risk.routes';
import webhookRoutes from './webhook.routes';
import adminRoutes from './admin.routes';
import analyticsRoutes from './analytics.routes';
import streamRoutes from './stream.routes';

const router = Router();

// API v1 Routes
const v1Router = Router();

// Health check endpoint (public)
v1Router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// Readiness check (includes database connectivity)
v1Router.get('/health/ready', async (req, res) => {
  try {
    // Check database connectivity
    const db = require('../database').default;
    await db.raw('SELECT 1+1 AS result');

    // Check Redis connectivity
    const cache = require('../cache').default;
    await cache.ping();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        cache: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
v1Router.use('/auth', authRoutes);
v1Router.use('/link', linkRoutes);
v1Router.use('/item', itemRoutes);
v1Router.use('/accounts', accountRoutes);
v1Router.use('/transactions', transactionRoutes);
v1Router.use('/credit-score', creditScoreRoutes);
v1Router.use('/risk', riskRoutes);
v1Router.use('/webhooks', webhookRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/analytics', analyticsRoutes);
v1Router.use('/stream', streamRoutes);

// Mount v1 routes
router.use('/v1', v1Router);

// API documentation route
router.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'ReshADX API',
    version: '1.0.0',
    description: 'Open Banking API for Africa',
    documentation: '/api-docs',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      link: '/api/v1/link',
      items: '/api/v1/item',
      accounts: '/api/v1/accounts',
      transactions: '/api/v1/transactions',
      creditScore: '/api/v1/credit-score',
      risk: '/api/v1/risk',
      webhooks: '/api/v1/webhooks',
      analytics: '/api/v1/analytics',
      stream: '/api/v1/stream',
    },
  });
});

export default router;
