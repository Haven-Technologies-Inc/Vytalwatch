// Winston Logger Configuration
// Enterprise-grade logging

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Create transports array
const transports: winston.transport[] = [];

// Console transport
if (config.isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        customFormat
      ),
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), errors({ stack: true }), json()),
    })
  );
}

// File transports
transports.push(
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: combine(timestamp(), errors({ stack: true }), json()),
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: combine(timestamp(), errors({ stack: true }), json()),
  })
);

// Elasticsearch transport (production)
if (config.elasticsearch.enabled && config.isProduction) {
  const esTransport = new ElasticsearchTransport({
    level: 'info',
    clientOpts: {
      node: config.elasticsearch.node,
      auth: {
        username: config.elasticsearch.auth.username,
        password: config.elasticsearch.auth.password,
      },
    },
    index: 'reshadx-logs',
  });

  transports.push(esTransport);
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: {
    service: 'reshadx-backend',
    environment: config.env,
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Create child logger with additional context
export const createLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

export default logger;
