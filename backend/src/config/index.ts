// ReshADX Configuration
// Enterprise-grade configuration management

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return parseInt(value, 10);
};

const getEnvBoolean = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const config = {
  // Environment
  env: getEnv('NODE_ENV', 'development'),
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  isTest: getEnv('NODE_ENV', 'development') === 'test',

  // Server
  server: {
    port: getEnvNumber('PORT', 3000),
    url: getEnv('SERVER_URL', 'http://localhost:3000'),
    apiVersion: 'v1',
  },

  // CORS
  cors: {
    allowedOrigins: getEnv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(','),
  },

  // Database - PostgreSQL
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    name: getEnv('DB_NAME', 'reshadx'),
    user: getEnv('DB_USER', 'postgres'),
    password: getEnv('DB_PASSWORD', 'postgres'),
    ssl: getEnvBoolean('DB_SSL', false),
    pool: {
      min: getEnvNumber('DB_POOL_MIN', 2),
      max: getEnvNumber('DB_POOL_MAX', 10),
    },
  },

  // MongoDB (for documents, logs, analytics)
  mongodb: {
    uri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/reshadx'),
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
    },
  },

  // Redis (caching, session, rate limiting)
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getEnvNumber('REDIS_DB', 0),
    tls: getEnvBoolean('REDIS_TLS', false),
  },

  // Kafka (event streaming)
  kafka: {
    enabled: getEnvBoolean('KAFKA_ENABLED', false),
    brokers: getEnv('KAFKA_BROKERS', 'localhost:9092').split(','),
    clientId: 'reshadx-backend',
    groupId: 'reshadx-consumer-group',
  },

  // JWT
  jwt: {
    secret: getEnv('JWT_SECRET'),
    refreshTokenSecret: getEnv('JWT_REFRESH_SECRET', getEnv('JWT_SECRET')),
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256' as const,
  },

  // Encryption
  encryption: {
    masterKey: getEnv('MASTER_ENCRYPTION_KEY'),
    algorithm: 'aes-256-gcm' as const,
  },

  // API Keys
  apiKeys: {
    saltRounds: 10,
  },

  // Rate Limiting
  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5, // 5 login attempts per 15 minutes
    },
    api: {
      free: {
        windowMs: 60 * 1000, // 1 minute
        max: 100,
      },
      startup: {
        windowMs: 60 * 1000,
        max: 500,
      },
      growth: {
        windowMs: 60 * 1000,
        max: 2000,
      },
      business: {
        windowMs: 60 * 1000,
        max: 10000,
      },
      enterprise: {
        windowMs: 60 * 1000,
        max: 100000,
      },
    },
  },

  // Sentry (Error Tracking)
  sentry: {
    dsn: getEnv('SENTRY_DSN', ''),
    tracesSampleRate: getEnvNumber('SENTRY_TRACES_SAMPLE_RATE', 1.0),
  },

  // New Relic (APM)
  newRelic: {
    enabled: getEnvBoolean('NEW_RELIC_ENABLED', false),
    licenseKey: getEnv('NEW_RELIC_LICENSE_KEY', ''),
    appName: 'ReshADX Backend',
  },

  // Elasticsearch (Logging)
  elasticsearch: {
    enabled: getEnvBoolean('ELASTICSEARCH_ENABLED', false),
    node: getEnv('ELASTICSEARCH_NODE', 'http://localhost:9200'),
    auth: {
      username: getEnv('ELASTICSEARCH_USERNAME', ''),
      password: getEnv('ELASTICSEARCH_PASSWORD', ''),
    },
  },

  // AWS
  aws: {
    region: getEnv('AWS_REGION', 'us-east-1'),
    accessKeyId: getEnv('AWS_ACCESS_KEY_ID', ''),
    secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY', ''),
    s3: {
      bucket: getEnv('AWS_S3_BUCKET', ''),
      region: getEnv('AWS_S3_REGION', 'us-east-1'),
    },
    ses: {
      enabled: getEnvBoolean('AWS_SES_ENABLED', false),
      fromEmail: getEnv('AWS_SES_FROM_EMAIL', ''),
    },
  },

  // Twilio (SMS)
  twilio: {
    accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
    fromNumber: getEnv('TWILIO_FROM_NUMBER', ''),
  },

  // Email
  email: {
    provider: getEnv('EMAIL_PROVIDER', 'smtp') as 'smtp' | 'ses',
    smtp: {
      host: getEnv('SMTP_HOST', ''),
      port: getEnvNumber('SMTP_PORT', 587),
      secure: getEnvBoolean('SMTP_SECURE', false),
      auth: {
        user: getEnv('SMTP_USER', ''),
        pass: getEnv('SMTP_PASS', ''),
      },
    },
    from: {
      name: 'ReshADX',
      email: getEnv('EMAIL_FROM', 'noreply@reshadx.com'),
    },
  },

  // Third-party APIs
  thirdParty: {
    // Ghana
    nia: {
      apiKey: getEnv('NIA_API_KEY', ''), // Ghana Card verification
      baseUrl: 'https://api.nia.gov.gh/v1',
    },
    ssnit: {
      apiKey: getEnv('SSNIT_API_KEY', ''), // Social Security
      baseUrl: 'https://api.ssnit.gov.gh/v1',
    },
    ghipss: {
      apiKey: getEnv('GHIPSS_API_KEY', ''), // Payment system
      baseUrl: 'https://api.ghipss.net/v1',
    },

    // Mobile Money
    mtn: {
      apiKey: getEnv('MTN_MOMO_API_KEY', ''),
      apiSecret: getEnv('MTN_MOMO_API_SECRET', ''),
      baseUrl: 'https://proxy.momoapi.mtn.com',
      subscriptionKey: getEnv('MTN_MOMO_SUBSCRIPTION_KEY', ''),
    },
    vodafone: {
      apiKey: getEnv('VODAFONE_API_KEY', ''),
      baseUrl: 'https://api.vodafone.com.gh/v1',
    },

    // Nigeria
    nibss: {
      apiKey: getEnv('NIBSS_API_KEY', ''), // Payment system
      baseUrl: 'https://api.nibss-plc.com.ng/v1',
    },
    nimc: {
      apiKey: getEnv('NIMC_API_KEY', ''), // National ID
      baseUrl: 'https://api.nimc.gov.ng/v1',
    },

    // Kenya
    mpesa: {
      consumerKey: getEnv('MPESA_CONSUMER_KEY', ''),
      consumerSecret: getEnv('MPESA_CONSUMER_SECRET', ''),
      baseUrl: 'https://api.safaricom.co.ke',
      passKey: getEnv('MPESA_PASS_KEY', ''),
    },

    // Sanctions screening
    ofac: {
      apiKey: getEnv('OFAC_API_KEY', ''),
    },
  },

  // ML Models
  ml: {
    fraudDetection: {
      modelPath: path.join(__dirname, '../../models/fraud-detection/model.json'),
      threshold: 0.7,
    },
    creditScoring: {
      modelPath: path.join(__dirname, '../../models/credit-scoring/model.json'),
    },
    transactionCategorization: {
      modelPath: path.join(__dirname, '../../models/categorization/model.json'),
    },
  },

  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    destination: path.join(__dirname, '../../uploads'),
  },

  // Webhooks
  webhooks: {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 10000,
  },

  // Security
  security: {
    bcryptRounds: 12,
    otpLength: 6,
    otpExpiryMinutes: 10,
    sessionDurationMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
  },

  // Compliance
  compliance: {
    amlThresholds: {
      GHS: 30000,
      NGN: 5000000,
      KES: 1000000,
      USD: 10000,
    },
    dataRetentionDays: 2555, // 7 years
  },

  // Feature Flags
  features: {
    fraudDetection: getEnvBoolean('FEATURE_FRAUD_DETECTION', true),
    creditScoring: getEnvBoolean('FEATURE_CREDIT_SCORING', true),
    transactionEnrichment: getEnvBoolean('FEATURE_TRANSACTION_ENRICHMENT', true),
    paymentInitiation: getEnvBoolean('FEATURE_PAYMENT_INITIATION', true),
    webhooks: getEnvBoolean('FEATURE_WEBHOOKS', true),
    graphql: getEnvBoolean('FEATURE_GRAPHQL', false),
    websockets: getEnvBoolean('FEATURE_WEBSOCKETS', true),
  },

  // Monitoring
  monitoring: {
    metricsEnabled: getEnvBoolean('METRICS_ENABLED', true),
    metricsPort: getEnvNumber('METRICS_PORT', 9090),
    healthCheckInterval: 30000, // 30 seconds
  },
};

// Validate configuration
export const validateConfig = (): void => {
  const required = [
    'JWT_SECRET',
    'MASTER_ENCRYPTION_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Export individual configs for convenience
export const {
  server,
  database,
  redis,
  jwt,
  encryption,
  rateLimit,
  thirdParty,
  ml,
  security,
  compliance,
  features,
} = config;

export default config;
