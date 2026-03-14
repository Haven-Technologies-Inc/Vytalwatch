/**
 * VytalWatch Frontend Configuration
 * Centralized configuration management
 */

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url === 'https://' || url === 'http://') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_API_URL must be set in production');
    }
    return 'http://localhost:3001';
  }
  return url;
}

export const config = {
  // API Configuration
  api: {
    baseUrl: getApiUrl() + '/api/v1',
    timeout: 30000,
  },

  // App Info
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'VytalWatch AI',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    description: 'AI-Powered Remote Patient Monitoring Platform',
  },

  // Feature Flags
  features: {
    demoMode: process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true',
    aiInsights: process.env.NEXT_PUBLIC_ENABLE_AI_INSIGHTS === 'true',
    billing: process.env.NEXT_PUBLIC_ENABLE_BILLING === 'true',
  },

  // Stripe
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },

  // OAuth
  oauth: {
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
    microsoft: {
      clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    },
    apple: {
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
    },
  },

  // Vital Sign Thresholds
  vitals: {
    bloodPressure: {
      systolic: { normal: [90, 120], warning: [121, 139], critical: [140, 200] },
      diastolic: { normal: [60, 80], warning: [81, 89], critical: [90, 120] },
    },
    glucose: {
      fasting: { normal: [70, 100], warning: [101, 125], critical: [126, 500] },
      postMeal: { normal: [70, 140], warning: [141, 199], critical: [200, 500] },
    },
    spo2: {
      normal: [95, 100],
      warning: [92, 94],
      critical: [0, 91],
    },
    heartRate: {
      normal: [60, 100],
      low: { warning: [50, 59], critical: [0, 49] },
      high: { warning: [101, 120], critical: [121, 200] },
    },
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Date/Time formats
  dateFormats: {
    date: 'MMM dd, yyyy',
    time: 'h:mm a',
    dateTime: 'MMM dd, yyyy h:mm a',
    apiDate: 'yyyy-MM-dd',
  },
} as const;

export default config;
