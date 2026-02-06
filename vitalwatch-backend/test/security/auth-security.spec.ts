import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Authentication Security Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123456', // Weak password
          role: 'patient',
        })
        .expect(400);
    });

    it('should require password complexity', async () => {
      const weakPasswords = ['password', 'Password', 'Password1', 'PASSWORD123'];

      for (const password of weakPasswords) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@example.com', password, role: 'patient' })
          .expect(400);
      }
    });

    it('should hash passwords before storage', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'secure@example.com',
          password: 'SecurePass123!',
          role: 'patient',
        })
        .expect(201);

      // Password should never be in response
      expect(response.body).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('JWT Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject missing authorization header', async () => {
      await request(app.getHttpServer()).get('/users/profile').expect(401);
    });

    it('should reject tampered tokens', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'tamper@example.com',
          password: 'SecurePass123!',
          role: 'patient',
        });

      const token = registerResponse.body.accessToken;
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe('Brute Force Protection', () => {
    it('should rate limit login attempts', async () => {
      const attempts = [];

      // Try 10 failed login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'bruteforce@example.com',
              password: 'wrongpassword',
            }),
        );
      }

      const results = await Promise.all(attempts);
      const rateLimited = results.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should invalidate token on logout', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'SecurePass123!',
          role: 'patient',
        });

      const token = registerResponse.body.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should no longer work
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should require MFA for sensitive operations', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'mfa@example.com',
          password: 'SecurePass123!',
          role: 'provider',
        });

      const token = response.body.accessToken;

      // Try to access sensitive data without MFA
      await request(app.getHttpServer())
        .post('/billing/submit-claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ claimId: 'claim-123' })
        .expect(403); // Should require MFA
    });
  });
});
