/**
 * ReshADX - Streaming Routes
 * Real-time data streaming via Server-Sent Events
 */

import { Router } from 'express';
import { StreamController } from '../controllers/stream.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const streamController = new StreamController();

/**
 * @route   GET /api/stream/transactions
 * @desc    Stream real-time transaction updates
 * @access  Private
 */
router.get(
  '/transactions',
  authenticate,
  (req, res) => streamController.streamTransactions(req, res)
);

/**
 * @route   GET /api/stream/accounts
 * @desc    Stream account updates
 * @access  Private
 */
router.get(
  '/accounts',
  authenticate,
  (req, res) => streamController.streamAccounts(req, res)
);

/**
 * @route   GET /api/stream/balances
 * @desc    Stream balance updates
 * @access  Private
 */
router.get(
  '/balances',
  authenticate,
  (req, res) => streamController.streamBalances(req, res)
);

/**
 * @route   GET /api/stream/fraud-alerts
 * @desc    Stream fraud detection alerts
 * @access  Private
 */
router.get(
  '/fraud-alerts',
  authenticate,
  (req, res) => streamController.streamFraudAlerts(req, res)
);

/**
 * @route   GET /api/stream/analytics
 * @desc    Stream real-time analytics updates
 * @access  Private
 */
router.get(
  '/analytics',
  authenticate,
  (req, res) => streamController.streamAnalytics(req, res)
);

export default router;
