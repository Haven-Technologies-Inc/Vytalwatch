// ReshADX Backend - Enterprise API Server
// Entry point for the application

import express, { Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/error-handler';
import { rateLimiter } from './middlewares/rate-limiter';
import { authentication } from './middlewares/authentication';
import { requestId } from './middlewares/request-id';
import { metricsMiddleware } from './middlewares/metrics';

// Routes
import apiV1Routes from './routes/v1';
import healthRoutes from './routes/health';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';

// Database connections
import { initializeDatabase } from './database';
import { initializeRedis } from './cache';
import { initializeKafka } from './queue/kafka';

// WebSocket handlers
import { initializeWebSocket } from './websocket';

// Swagger documentation
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json';

// ============================================================================
// APPLICATION SETUP
// ============================================================================

class ReshADXServer {
  private app: Application;
  private server: http.Server;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.allowedOrigins,
        credentials: true,
      },
    });
    this.port = config.server.port;

    this.initializeErrorTracking();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize Sentry error tracking
   */
  private initializeErrorTracking(): void {
    if (config.sentry.dsn) {
      Sentry.init({
        dsn: config.sentry.dsn,
        environment: config.env,
        tracesSampleRate: 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: this.app }),
        ],
      });

      this.app.use(Sentry.Handlers.requestHandler());
      this.app.use(Sentry.Handlers.tracingHandler());
    }
  }

  /**
   * Initialize Express middlewares
   */
  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Logging
    if (config.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
      }));
    }

    // Request tracking
    this.app.use(requestId);

    // Metrics
    this.app.use(metricsMiddleware);

    // Rate limiting (global)
    this.app.use(rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per window
    }));

    // Trust proxy (for rate limiting behind load balancers)
    this.app.set('trust proxy', 1);
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes);

    // API documentation
    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // Webhooks (custom auth)
    this.app.use('/webhooks', webhookRoutes);

    // API v1 (requires authentication)
    this.app.use('/api/v1', authentication, apiV1Routes);

    // Admin routes (requires admin role)
    this.app.use('/admin', authentication, adminRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'ReshADX API',
        version: '1.0.0',
        description: 'Enterprise Open Banking API for Africa',
        documentation: `${config.server.url}/api/docs`,
        health: `${config.server.url}/health`,
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        request_id: req.id,
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // Sentry error handler
    if (config.sentry.dsn) {
      this.app.use(Sentry.Handlers.errorHandler());
    }

    // Custom error handler
    this.app.use(errorHandler);
  }

  /**
   * Initialize database connections
   */
  private async initializeDatabases(): Promise<void> {
    try {
      logger.info('Initializing databases...');

      // PostgreSQL
      await initializeDatabase();
      logger.info('✓ PostgreSQL connected');

      // Redis
      await initializeRedis();
      logger.info('✓ Redis connected');

      // Kafka
      if (config.kafka.enabled) {
        await initializeKafka();
        logger.info('✓ Kafka connected');
      }

      logger.info('All databases initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize databases:', error);
      throw error;
    }
  }

  /**
   * Initialize WebSocket connections
   */
  private initializeWebSocketServer(): void {
    initializeWebSocket(this.io);
    logger.info('✓ WebSocket server initialized');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize databases
      await this.initializeDatabases();

      // Initialize WebSocket
      this.initializeWebSocketServer();

      // Start HTTP server
      this.server.listen(this.port, () => {
        logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                   🚀 ReshADX Backend Server                  ║
║                                                               ║
║   Environment:  ${config.env.padEnd(43)}║
║   Port:         ${this.port.toString().padEnd(43)}║
║   URL:          ${config.server.url.padEnd(43)}║
║   Documentation: ${(config.server.url + '/api/docs').padEnd(42)}║
║                                                               ║
║   Status:       ✓ Running                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
        `);

        logger.info('Server is ready to accept connections');
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new requests
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close WebSocket connections
      this.io.close(() => {
        logger.info('WebSocket server closed');
      });

      // Close database connections
      // await closeDatabase();
      // await closeRedis();
      // await closeKafka();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// ============================================================================
// START SERVER
// ============================================================================

const server = new ReshADXServer();
server.start();

export default server;
