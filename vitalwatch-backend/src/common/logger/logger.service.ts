import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('app.env') || 'development';
    const isProduction = nodeEnv === 'production';

    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: 'ISO' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const devFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
        const ctx = context ? `[${context}]` : '';
        const reqId = requestId ? `[${requestId}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${ctx}${reqId} ${message}${metaStr}`;
      }),
    );

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: isProduction ? jsonFormat : devFormat,
      defaultMeta: { service: 'vitalwatch-backend' },
      transports: [
        new winston.transports.Console(),
      ],
    });
  }

  log(message: any, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string): void {
    this.logger.error(message, { context, trace });
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context });
  }

  logWithRequestId(level: string, message: string, requestId: string, context?: string): void {
    this.logger.log(level, message, { requestId, context });
  }
}
