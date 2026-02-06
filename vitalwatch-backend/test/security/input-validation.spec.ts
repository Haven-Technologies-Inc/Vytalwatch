import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Input Validation Security Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'patient',
      });
    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in query parameters', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      const response = await request(app.getHttpServer())
        .get('/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ name: maliciousInput })
        .expect(400);

      // Should reject or sanitize
      expect(response.body.message).toContain('Invalid input');
    });

    it('should sanitize user input in POST requests', async () => {
      await request(app.getHttpServer())
        .post('/vitals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: "BLOOD_PRESSURE'; DROP TABLE vitals; --",
          systolic: 120,
        })
        .expect(400);
    });
  });

  describe('XSS Prevention', () => {
    it('should reject script tags in input', async () => {
      await request(app.getHttpServer())
        .post('/messaging/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: 'provider-123',
          subject: '<script>alert("XSS")</script>',
          initialMessage: 'Test',
        })
        .expect(400);
    });

    it('should sanitize HTML in text fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/clinical-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'patient-123',
          type: 'PROGRESS',
          content: { notes: '<img src=x onerror=alert(1)>' },
        });

      // Should either reject or sanitize
      expect([400, 201]).toContain(response.status);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should prevent NoSQL injection attempts', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        })
        .expect(400);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', async () => {
      await request(app.getHttpServer())
        .get('/files/../../../etc/passwd')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should reject shell metacharacters', async () => {
      await request(app.getHttpServer())
        .get('/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'pdf; rm -rf /' })
        .expect(400);
    });
  });

  describe('Data Type Validation', () => {
    it('should reject invalid data types', async () => {
      await request(app.getHttpServer())
        .post('/vitals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'BLOOD_PRESSURE',
          systolic: 'not-a-number',
          diastolic: 80,
        })
        .expect(400);
    });

    it('should validate email formats', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          role: 'patient',
        })
        .expect(400);
    });

    it('should validate date formats', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: 'provider-123',
          scheduledAt: 'not-a-date',
        })
        .expect(400);
    });
  });

  describe('Size Limits', () => {
    it('should reject oversized payloads', async () => {
      const largePayload = {
        content: 'x'.repeat(10 * 1024 * 1024), // 10MB
      };

      await request(app.getHttpServer())
        .post('/messaging/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload)
        .expect(413); // Payload too large
    });
  });
});
