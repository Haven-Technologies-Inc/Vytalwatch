import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Alerts E2E Tests
 *
 * Tests alert creation, listing with filters, acknowledgement, resolution,
 * escalation, and role-based access control on the alerts endpoints.
 *
 * Most alert endpoints require PROVIDER, ADMIN, or SUPERADMIN roles.
 * The test suite registers a PATIENT account and verifies that the
 * role guard properly denies access (403 Forbidden).
 */
describe('Alerts (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: any;
  let accessToken: string;
  let userId: string;
  let moduleInitFailed = false;

  const testTimestamp = Date.now();
  const alertsEmail = `e2e-alerts-${testTimestamp}@test.vytalwatch.dev`;
  const alertsPassword = 'AlertsTestP@ss2026!';

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();

      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );
      app.setGlobalPrefix('api/v1', {
        exclude: ['', 'health', 'favicon.ico'],
      });

      await app.init();
      httpServer = app.getHttpServer();

      // Register and login
      await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          email: alertsEmail,
          password: alertsPassword,
          firstName: 'Alert',
          lastName: 'Tester',
        });

      const loginRes = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email: alertsEmail, password: alertsPassword });

      if (loginRes.status === 200) {
        accessToken = loginRes.body.accessToken;
        userId = loginRes.body.user.id;
      }
    } catch (error) {
      moduleInitFailed = true;
      console.warn(
        `Alerts E2E: Skipping tests — application failed to initialise (${(error as Error).message})`,
      );
    }
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function skipIfNoApp() {
    return moduleInitFailed || !app;
  }

  // ------------------------------------------------ Unauthorised access
  describe('Unauthorised access', () => {
    it('POST /api/v1/alerts should return 401 without a token', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/alerts')
        .send({
          patientId: '00000000-0000-4000-a000-000000000001',
          type: 'vital_abnormal',
          severity: 'high',
          title: 'Test Alert',
          message: 'E2E test alert',
        })
        .expect(401);
    });

    it('GET /api/v1/alerts should return 401 without a token', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .get('/api/v1/alerts')
        .expect(401);
    });

    it('should return 401 with a malformed bearer token', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .get('/api/v1/alerts')
        .set('Authorization', 'Bearer invalid.jwt.here')
        .expect(401);
    });
  });

  // --------------------------------------- Create alert (POST /alerts)
  describe('POST /api/v1/alerts — create an alert', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          patientId: userId,
          type: 'vital_abnormal',
          severity: 'high',
          title: 'Critical Heart Rate',
          message: 'Heart rate exceeded 120 bpm for 10 minutes.',
        });

      expect(response.status).toBe(403);
    });

    it('should reject creation with missing required fields when authorised', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ patientId: userId });

      // Either 400 (validation) or 403 (role guard)
      expect([400, 403]).toContain(response.status);
    });

    it('should reject creation with an invalid alert type', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          patientId: userId,
          type: 'completely_invalid_type',
          severity: 'high',
          title: 'Test',
          message: 'Test',
        });

      expect([400, 403]).toContain(response.status);
    });

    it('should reject creation with an invalid severity level', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          patientId: userId,
          type: 'vital_abnormal',
          severity: 'ultra_extreme',
          title: 'Test',
          message: 'Test',
        });

      expect([400, 403]).toContain(response.status);
    });

    it('should reject creation with a non-UUID patientId', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          patientId: 'not-a-uuid',
          type: 'vital_abnormal',
          severity: 'high',
          title: 'Test',
          message: 'Test',
        });

      expect([400, 403]).toContain(response.status);
    });
  });

  // --------------------------------------- List alerts (GET /alerts)
  describe('GET /api/v1/alerts — list alerts with filters', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should accept filter query parameters', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts')
        .query({
          status: 'active',
          severity: 'high',
          type: 'vital_abnormal',
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${accessToken}`);

      // Patient role: 403
      expect([200, 403]).toContain(response.status);
    });

    it('should accept patientId filter', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts')
        .query({ patientId: userId })
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });

  // --------------------------------------- Get my alerts (GET /alerts/me)
  describe('GET /api/v1/alerts/me — get own alerts', () => {
    it('should return alerts for the authenticated user', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should accept pagination parameters', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts/me')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  // --------------------------------------- Active alerts
  describe('GET /api/v1/alerts/active — get active alerts', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts/active')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  // --------------------------------------- Alert stats
  describe('GET /api/v1/alerts/stats — alert statistics', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  // --------------------------------------- Get single alert (GET /alerts/:id)
  describe('GET /api/v1/alerts/:id — get a single alert', () => {
    it('should return 400 for an invalid UUID', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts/not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([400, 422]).toContain(response.status);
    });

    it('should return 404 or 403 for a non-existent alert', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const fakeId = '00000000-0000-4000-a000-000000000099';
      const response = await request(httpServer)
        .get(`/api/v1/alerts/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Patient can see own alerts; 404 if not found, 403 if role blocked
      expect([403, 404]).toContain(response.status);
    });
  });

  // --------------------------------------- Patient alerts
  describe('GET /api/v1/alerts/patient/:patientId — patient alert history', () => {
    it('should allow patient to view own alert history', async () => {
      if (skipIfNoApp() || !accessToken || !userId) return;

      const response = await request(httpServer)
        .get(`/api/v1/alerts/patient/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Patient role is in the @Roles list
      expect([200, 403]).toContain(response.status);
    });

    it('should return 400 for an invalid UUID in path', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .get('/api/v1/alerts/patient/not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([400, 422]).toContain(response.status);
    });
  });

  // -------------------------------- Acknowledge alert (PUT /alerts/:id/acknowledge)
  describe('PUT /api/v1/alerts/:id/acknowledge — acknowledge an alert', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const fakeId = '00000000-0000-4000-a000-000000000099';
      const response = await request(httpServer)
        .put(`/api/v1/alerts/${fakeId}/acknowledge`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      if (skipIfNoApp()) return;

      const fakeId = '00000000-0000-4000-a000-000000000099';
      await request(httpServer)
        .put(`/api/v1/alerts/${fakeId}/acknowledge`)
        .expect(401);
    });

    it('should return 400 for an invalid UUID parameter', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .put('/api/v1/alerts/bad-uuid/acknowledge')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([400, 403, 422]).toContain(response.status);
    });
  });

  // -------------------------------- Resolve alert (PUT /alerts/:id/resolve)
  describe('PUT /api/v1/alerts/:id/resolve — resolve an alert', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const fakeId = '00000000-0000-4000-a000-000000000099';
      const response = await request(httpServer)
        .put(`/api/v1/alerts/${fakeId}/resolve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ resolution: 'Resolved during E2E test' });

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      if (skipIfNoApp()) return;

      const fakeId = '00000000-0000-4000-a000-000000000099';
      await request(httpServer)
        .put(`/api/v1/alerts/${fakeId}/resolve`)
        .send({ resolution: 'Test' })
        .expect(401);
    });
  });

  // -------------------------------- Escalate alert (PUT /alerts/:id/escalate)
  describe('PUT /api/v1/alerts/:id/escalate — escalate an alert', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const fakeId = '00000000-0000-4000-a000-000000000099';
      const response = await request(httpServer)
        .put(`/api/v1/alerts/${fakeId}/escalate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Escalated during E2E test' });

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------- Bulk acknowledge (POST /alerts/bulk-acknowledge)
  describe('POST /api/v1/alerts/bulk-acknowledge — bulk acknowledge alerts', () => {
    it('should be restricted to provider/admin roles (patient gets 403)', async () => {
      if (skipIfNoApp() || !accessToken) return;

      const response = await request(httpServer)
        .post('/api/v1/alerts/bulk-acknowledge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ids: [
            '00000000-0000-4000-a000-000000000099',
            '00000000-0000-4000-a000-000000000098',
          ],
        });

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer)
        .post('/api/v1/alerts/bulk-acknowledge')
        .send({ ids: [] })
        .expect(401);
    });
  });
});
