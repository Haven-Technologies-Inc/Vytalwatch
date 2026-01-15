export default () => ({
  // Application
  app: {
    port: parseInt(process.env.PORT, 10) || 3001,
    env: process.env.NODE_ENV || 'development',
    name: 'VitalWatch AI',
    version: '1.0.0',
  },

  // Database
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'vitalwatch',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // OAuth Providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/auth/microsoft/callback',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      teamId: process.env.APPLE_TEAM_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackUrl: process.env.APPLE_CALLBACK_URL || 'http://localhost:3001/auth/apple/callback',
    },
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
      professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    },
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // Zoho SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'noreply@vitalwatch.ai',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2000,
  },

  // Grok AI
  grok: {
    apiKey: process.env.GROK_API_KEY,
    baseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
  },

  // Tenovi
  tenovi: {
    apiKey: process.env.TENOVI_API_KEY,
    webhookSecret: process.env.TENOVI_WEBHOOK_SECRET,
    baseUrl: process.env.TENOVI_BASE_URL || 'https://api.tenovi.com/v1',
  },

  // Alert Thresholds
  alertThresholds: {
    bloodPressure: {
      critical: { systolic: 180, diastolic: 110 },
      warning: { systolic: 160, diastolic: 100 },
    },
    glucose: {
      critical: { min: 70, max: 400 },
      warning: { min: 80, max: 300 },
    },
    spo2: {
      critical: { min: 90 },
      warning: { min: 92 },
    },
    weight: {
      criticalChange: { amount: 5, days: 2 }, // 5 lbs in 2 days
    },
  },

  // CPT Codes for RPM billing
  cptCodes: {
    initialSetup: { code: '99453', amount: 19 },
    deviceSupply: { code: '99454', amount: 64, minDays: 16 },
    clinicalReview20: { code: '99457', amount: 51, minMinutes: 20 },
    clinicalReviewAdditional: { code: '99458', amount: 41, minMinutes: 40 },
  },

  // Audit settings
  audit: {
    retentionDays: 365, // HIPAA requires 6 years, but configurable
    sensitiveFields: ['ssn', 'dob', 'password', 'token'],
  },
});
