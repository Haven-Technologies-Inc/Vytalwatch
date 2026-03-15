import { Logger } from '@nestjs/common';

interface EnvRule {
  key: string;
  required: 'always' | 'production';
  description: string;
}

const ENV_RULES: EnvRule[] = [
  // Database
  { key: 'DB_HOST', required: 'production', description: 'PostgreSQL host' },
  { key: 'DB_PASSWORD', required: 'production', description: 'PostgreSQL password' },
  { key: 'DB_DATABASE', required: 'production', description: 'PostgreSQL database name' },

  // Auth
  {
    key: 'JWT_SECRET',
    required: 'always',
    description: 'JWT signing secret (openssl rand -base64 64)',
  },

  // Redis
  { key: 'REDIS_HOST', required: 'production', description: 'Redis host' },

  // Frontend URL (CORS)
  { key: 'FRONTEND_URL', required: 'production', description: 'Frontend URL for CORS' },
];

export function validateEnvironment(): void {
  const logger = new Logger('EnvValidation');
  const env = process.env.NODE_ENV || 'development';
  const missing: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.key];
    const isSet = value !== undefined && value !== '';

    if (!isSet) {
      if (rule.required === 'always') {
        missing.push(`  ${rule.key} — ${rule.description}`);
      } else if (rule.required === 'production' && env === 'production') {
        missing.push(`  ${rule.key} — ${rule.description}`);
      }
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.join('\n')}`;
    if (env === 'production') {
      logger.error(message);
      throw new Error(
        'Cannot start in production with missing required environment variables. See logs above.',
      );
    } else {
      logger.warn(message);
    }
  }
}
