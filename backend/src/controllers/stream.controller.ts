/**
 * ReshADX - Real-time Streaming Controller
 * Server-Sent Events (SSE) for real-time transaction updates
 */

import { Request, Response } from 'express';
import { StreamingService } from '../services/streaming.service';
import { logger } from '../utils/logger';

export class StreamController {
  private streamingService: StreamingService;

  constructor() {
    this.streamingService = new StreamingService();
  }

  /**
   * Stream transactions for a specific item or account
   * GET /api/v1/stream/transactions
   */
  async streamTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { itemId, accountId } = req.query;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Subscribe to transaction updates
      const subscription = this.streamingService.subscribeToTransactions(
        userId,
        itemId as string | undefined,
        accountId as string | undefined,
        (event) => {
          // Send event to client
          res.write(`event: ${event.type}\n`);
          res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        }
      );

      logger.info('Transaction stream started', { userId, itemId, accountId });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        res.write(`: heartbeat\n\n`);
      }, 30000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        subscription.unsubscribe();
        logger.info('Transaction stream closed', { userId });
      });

    } catch (error: any) {
      logger.error('Error in transaction stream', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'STREAM_ERROR',
          message: 'Failed to initialize transaction stream',
        },
      });
    }
  }

  /**
   * Stream all account updates for a user
   * GET /api/v1/stream/accounts
   */
  async streamAccounts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Subscribe to account updates
      const subscription = this.streamingService.subscribeToAccounts(
        userId,
        (event) => {
          res.write(`event: ${event.type}\n`);
          res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        }
      );

      logger.info('Account stream started', { userId });

      // Heartbeat
      const heartbeatInterval = setInterval(() => {
        res.write(`: heartbeat\n\n`);
      }, 30000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        subscription.unsubscribe();
        logger.info('Account stream closed', { userId });
      });

    } catch (error: any) {
      logger.error('Error in account stream', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'STREAM_ERROR',
          message: 'Failed to initialize account stream',
        },
      });
    }
  }

  /**
   * Stream balance updates in real-time
   * GET /api/v1/stream/balances
   */
  async streamBalances(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { accountIds } = req.query;

      const accountIdList = accountIds
        ? (accountIds as string).split(',')
        : undefined;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Subscribe to balance updates
      const subscription = this.streamingService.subscribeToBalances(
        userId,
        accountIdList,
        (event) => {
          res.write(`event: ${event.type}\n`);
          res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        }
      );

      logger.info('Balance stream started', { userId, accountCount: accountIdList?.length || 'all' });

      // Heartbeat
      const heartbeatInterval = setInterval(() => {
        res.write(`: heartbeat\n\n`);
      }, 30000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        subscription.unsubscribe();
        logger.info('Balance stream closed', { userId });
      });

    } catch (error: any) {
      logger.error('Error in balance stream', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'STREAM_ERROR',
          message: 'Failed to initialize balance stream',
        },
      });
    }
  }

  /**
   * Stream fraud alerts in real-time
   * GET /api/v1/stream/fraud-alerts
   */
  async streamFraudAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Subscribe to fraud alerts
      const subscription = this.streamingService.subscribeToFraudAlerts(
        userId,
        (event) => {
          res.write(`event: ${event.type}\n`);
          res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        }
      );

      logger.info('Fraud alert stream started', { userId });

      // Heartbeat
      const heartbeatInterval = setInterval(() => {
        res.write(`: heartbeat\n\n`);
      }, 30000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        subscription.unsubscribe();
        logger.info('Fraud alert stream closed', { userId });
      });

    } catch (error: any) {
      logger.error('Error in fraud alert stream', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'STREAM_ERROR',
          message: 'Failed to initialize fraud alert stream',
        },
      });
    }
  }

  /**
   * Get active stream statistics
   * GET /api/v1/stream/stats
   */
  async getStreamStats(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const stats = this.streamingService.getStats(userId);

      return res.status(200).json({
        success: true,
        data: stats,
      });

    } catch (error: any) {
      logger.error('Error getting stream stats', { error: error.message });
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get stream statistics',
        },
      });
    }
  }
}
