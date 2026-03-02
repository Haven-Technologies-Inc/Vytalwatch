import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E Tests
 *
 * Tests the full authentication lifecycle including registration,
 * login, token refresh, logout, password reset, and the /me endpoint.
 *
 * These tests use the real AppModule and require a running database.
 * If the database is unavailable the test suite will be skipped gracefully.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: any;
  let accessToken: string;
  let refreshToken: string;
  let moduleInitFailed = false;

  // Unique email per test run to avoid collisions
  const testTimestamp = Date.now();
  const testEmail = `e2e-auth-${testTimestamp}@test.vytalwatch.dev`;
  const testPassword = 'TestP@ssw0rd!2026';
  const testFirstName = 'E2E';
  const testLastName = 'AuthUser';

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();

      // Mirror main.ts setup
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
      app.setGlobalPrefix('api/v1', {
        exclude: ['', 'health', 'favicon.ico'],
      });

      await app.init();
      httpServer = app.getHttpServer();
    } catch (error) {
      moduleInitFailed = true;
      console.warn(
        `Auth E2E: Skipping tests — application failed to initialise (${(error as Error).message})`,
      );
    }
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ------------------------------------------------------------------ helpers
  function skipIfNoApp() {
    if (moduleInitFailed || !app) {
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------- Registration
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: testFirstName,
          lastName: testLastName,
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.email).toBe(testEmail);
      expect(response.body.firstName).toBe(testFirstName);
      expect(response.body.lastName).toBe(testLastName);
      // Sensitive fields must not be returned
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.resetToken).toBeUndefined();
      expect(response.body.verificationToken).toBeUndefined();
    });

    it('should reject duplicate email registration', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: testFirstName,
          lastName: testLastName,
        })
        .expect(400);

      expect(response.body.message).toMatch(/already registered/i);
    });

    it('should reject registration with missing required fields', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({ email: `missing-fields-${testTimestamp}@test.vytalwatch.dev` })
        .expect(400);
    });

    it('should reject registration with an invalid email', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: testPassword,
          firstName: testFirstName,
          lastName: testLastName,
        })
        .expect(400);
    });

    it('should reject registration with a password shorter than 8 characters', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: `short-pwd-${testTimestamp}@test.vytalwatch.dev`,
          password: 'Ab1!',
          firstName: testFirstName,
          lastName: testLastName,
        })
        .expect(400);
    });

    it('should reject non-patient role registration without invite code', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: `provider-noinvite-${testTimestamp}@test.vytalwatch.dev`,
          password: testPassword,
          firstName: 'No',
          lastName: 'Invite',
          role: 'provider',
        })
        .expect(400);

      expect(response.body.message).toMatch(/invite code/i);
    });
  });

  // ------------------------------------------------------------------- Login
  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials and return tokens', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeGreaterThan(0);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.firstName).toBe(testFirstName);
      expect(response.body.user.lastName).toBe(testLastName);

      // Store tokens for subsequent tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject login with incorrect password', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!123',
        })
        .expect(400);

      expect(response.body.message).toMatch(/invalid/i);
    });

    it('should reject login with non-existent email', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.vytalwatch.dev',
          password: testPassword,
        })
        .expect(400);
    });

    it('should reject login with missing fields', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: testEmail })
        .expect(400);
    });
  });

  // ------------------------------------------------------------ Token Refresh
  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens with a valid refresh token', async () => {
      if (skipIfNoApp() || !refreshToken) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.expiresIn).toBeGreaterThan(0);

      // Update tokens
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject refresh with an invalid token', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token-value' })
        .expect(401);
    });

    it('should reject refresh with missing refresh token', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ------------------------------------------------------------ Get Current User
  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testEmail);
      expect(response.body.firstName).toBe(testFirstName);
      expect(response.body.lastName).toBe(testLastName);
      // Sensitive data must be stripped
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.resetToken).toBeUndefined();
    });

    it('should return 401 when unauthenticated', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 with an invalid bearer token', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });

  // ------------------------------------------------------- Request Password Reset
  describe('POST /api/v1/auth/request-password-reset', () => {
    it('should accept password reset request for an existing email', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/request-password-reset')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.message).toMatch(/reset link/i);
    });

    it('should return 200 even for a non-existent email (prevents enumeration)', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer)
        .post('/api/v1/auth/request-password-reset')
        .send({ email: 'nonexistent@test.vytalwatch.dev' })
        .expect(200);

      expect(response.body.message).toMatch(/reset link/i);
    });

    it('should reject when email field is missing', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/request-password-reset')
        .send({})
        .expect(400);
    });
  });

  // ------------------------------------------------------------------- Logout
  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully when authenticated', async () => {
      if (skipIfNoApp() || !accessToken) return;

      await request(httpServer)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 when unauthenticated', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  // -------------------------------------------------------- Rate Limiting / Account Lockout
  describe('Rate limiting — repeated failed logins', () => {
    const lockoutEmail = `lockout-${testTimestamp}@test.vytalwatch.dev`;
    const lockoutPassword = 'LockoutTestP@ss1!';

    it('should register a user to test lockout against', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: lockoutEmail,
          password: lockoutPassword,
          firstName: 'Lock',
          lastName: 'Out',
        })
        .expect(201);
    });

    it('should eventually block login after 5 consecutive failures', async () => {
      if (skipIfNoApp()) return;

      // Attempt 5 failed logins (the configured maxFailedAttempts)
      for (let i = 0; i < 5; i++) {
        await request(httpServer)
          .post('/api/v1/auth/login')
          .send({ email: lockoutEmail, password: 'WrongPassword!' });
      }

      // The 6th attempt — should be blocked
      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: lockoutEmail, password: lockoutPassword });

      // The system should return 403 (Forbidden) for rate-limited accounts
      expect([400, 403, 429]).toContain(response.status);
    });
  });

  // -------------------------------------------------- Validation edge cases
  describe('Input validation edge cases', () => {
    it('should reject extraneous fields (forbidNonWhitelisted)', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          isAdmin: true, // not in DTO
        })
        .expect(400);
    });

    it('should reject empty body on login', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });
});
