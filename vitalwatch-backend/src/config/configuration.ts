export default () => ({
  // Application
  app: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    name: 'VytalWatch AI',
    version: '1.0.0',
  },

  // Database
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'vitalwatch',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
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

  // Twilio (SMS/Voice)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // WebRTC TURN Server (self-hosted coturn)
  turn: {
    url: process.env.TURN_SERVER_URL || 'turn:localhost:3478',
    username: process.env.TURN_USERNAME || 'vitalwatch',
    credential: process.env.TURN_PASSWORD || 'VitalWatch2024!',
    realm: process.env.TURN_REALM || 'vitalwatch.local',
    ttl: parseInt(process.env.TURN_TTL || '3600', 10),
  },

  // ZeptoMail (Zoho Transactional Email)
  email: {
    zeptoToken: process.env.ZEPTOMAIL_TOKEN,
    from: process.env.EMAIL_FROM || 'noreply@vytalwatch.ai',
    fromName: process.env.EMAIL_FROM_NAME || 'VytalWatch AI',
  },

  // Zoho SMTP (fallback)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@vytalwatch.ai',
    fromName: process.env.SMTP_FROM_NAME || 'VytalWatch AI',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
  },

  // Grok AI
  grok: {
    apiKey: process.env.GROK_API_KEY,
    baseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
  },

  // Tenovi HWI API
  tenovi: {
    apiKey: process.env.TENOVI_API_KEY,
    apiUrl: process.env.TENOVI_API_URL || 'https://api2.tenovi.com',
    clientDomain: process.env.TENOVI_CLIENT_DOMAIN,
    webhookSecret: process.env.TENOVI_WEBHOOK_SECRET,
    webhookAuthKey: process.env.TENOVI_WEBHOOK_AUTH_KEY,
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

  // Audit settings (HIPAA compliant)
  audit: {
    retentionDays: 2190, // HIPAA requires 6 years minimum
    sensitiveFields: ['ssn', 'dob', 'password', 'token', 'insurancePolicyNumber'],
  },

  // Session security
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '15', 10),
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10),
    extendOnActivity: true,
  },

  // Security settings (rate limiting, lockout, password history)
  security: {
    maxFailedAttempts: parseInt(process.env.SECURITY_MAX_FAILED_ATTEMPTS || '5', 10),
    lockoutDurationMinutes: parseInt(process.env.SECURITY_LOCKOUT_DURATION_MINUTES || '15', 10),
    rateLimitWindowMinutes: parseInt(process.env.SECURITY_RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    passwordHistoryCount: parseInt(process.env.SECURITY_PASSWORD_HISTORY_COUNT || '5', 10),
  },

  // Password policy (HIPAA compliant)
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // days
    historyCount: 12, // prevent reuse of last 12 passwords
    lockoutAttempts: 5,
    lockoutDurationMinutes: 30,
  },

  // Emergency access (break-glass)
  emergencyAccess: {
    enabled: true,
    notifyEmails: process.env.EMERGENCY_ACCESS_NOTIFY_EMAILS?.split(',') || [],
    auditRetentionDays: 2190, // 6 years for emergency access logs
  },
});
