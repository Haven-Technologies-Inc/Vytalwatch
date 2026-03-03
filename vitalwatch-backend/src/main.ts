import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger/logger.service';
import { PaginationInterceptor } from './common/interceptors/pagination.interceptor';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate critical environment variables before starting
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Required for Stripe webhooks
  });

  const configService = app.get(ConfigService);

  // Replace default NestJS logger with Winston
  const winstonLogger = app.get(WinstonLoggerService);
  app.useLogger(winstonLogger);

  // CORS - never default to wildcard in production
  const frontendUrl = configService.get<string>('app.frontendUrl');
  const nodeEnv = configService.get<string>('app.env') || 'development';
  const corsOrigin = frontendUrl
    ? frontendUrl.split(',').map((url: string) => url.trim())
    : nodeEnv === 'production'
      ? [] // Block all in production if no FRONTEND_URL is set
      : ['http://localhost:3000', 'http://localhost:3001'];

  // Security — Helmet with Content Security Policy
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...(frontendUrl ? frontendUrl.split(',').map((u: string) => u.trim()) : [])],
        },
      },
    }),
  );
  app.use(compression());

  app.enableCors({
    origin: nodeEnv === 'production'
      ? corsOrigin
      : (origin, callback) => {
          // In development, allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) return callback(null, true);
          // Allow any localhost/127.0.0.1 port (for browser preview proxies)
          if (origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:')) {
            return callback(null, true);
          }
          if (corsOrigin.includes(origin)) {
            return callback(null, true);
          }
          callback(null, false);
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  if (!frontendUrl && nodeEnv === 'production') {
    logger.warn('FRONTEND_URL is not set — CORS will block all cross-origin requests in production');
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global pagination interceptor
  app.useGlobalInterceptors(new PaginationInterceptor());

  // API prefix (exclude root routes)
  app.setGlobalPrefix('api/v1', {
    exclude: ['', 'health', 'favicon.ico'],
  });

  // Swagger / OpenAPI documentation (disabled in production)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VytalWatch API')
      .setDescription('Remote Patient Monitoring Platform API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Users', 'User management')
      .addTag('Patients', 'Patient management')
      .addTag('Vitals', 'Vital signs & readings')
      .addTag('Alerts', 'Alert management')
      .addTag('Devices', 'Device management')
      .addTag('Billing', 'Billing & subscriptions')
      .addTag('Analytics', 'Analytics & reporting')
      .addTag('AI', 'AI insights & models')
      .addTag('Messages', 'Messaging')
      .addTag('Appointments', 'Appointments')
      .addTag('Notifications', 'Notifications')
      .addTag('Admin', 'Admin operations')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get('app.port') || 3001;

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${configService.get('app.nodeEnv')}`);
}

bootstrap();
