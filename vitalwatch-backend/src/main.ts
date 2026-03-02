import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Required for Stripe webhooks
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS - never default to wildcard in production
  const frontendUrl = configService.get<string>('app.frontendUrl');
  const nodeEnv = configService.get<string>('app.env') || 'development';
  const corsOrigin = frontendUrl
    ? frontendUrl.split(',').map((url: string) => url.trim())
    : nodeEnv === 'production'
      ? [] // Block all in production if no FRONTEND_URL is set
      : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: corsOrigin,
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

  // API prefix (exclude root routes)
  app.setGlobalPrefix('api/v1', {
    exclude: ['', 'health', 'favicon.ico'],
  });

  const port = configService.get('app.port') || 3001;

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${configService.get('app.nodeEnv')}`);
}

bootstrap();
