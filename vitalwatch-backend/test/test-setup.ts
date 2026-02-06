import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in test output

  // Set test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/vitalwatch_test';

  // Mock external services
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
  process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
  process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';

  // Encryption keys for testing
  process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 bytes
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

  console.log('Test environment initialized');
});

afterAll(async () => {
  // Global cleanup
  console.log('Test environment cleanup complete');
});

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global error handler for unhandled promises
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
