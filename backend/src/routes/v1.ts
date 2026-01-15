/**
 * ReshADX - API v1 Routes
 * Main router for API version 1
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
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';

const router = Router();

// Public routes (no auth required)
router.use('/auth', authRoutes);

// Protected routes (auth required)
router.use('/link', authenticate, linkRoutes);
router.use('/item', authenticate, itemRoutes);
router.use('/accounts', authenticate, accountRoutes);
router.use('/transactions', authenticate, transactionRoutes);
router.use('/credit-score', authenticate, creditScoreRoutes);
router.use('/risk', authenticate, riskRoutes);
router.use('/webhooks', authenticate, webhookRoutes);
router.use('/admin', authenticate, adminRoutes);
router.use('/analytics', authenticate, analyticsRoutes);
router.use('/stream', authenticate, streamRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'ReshADX API',
    version: '1.0.0',
    description: 'Open Banking API for Africa',
    endpoints: {
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
