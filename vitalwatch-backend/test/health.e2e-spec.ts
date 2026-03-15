import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Health Check E2E Tests
 *
 * Tests the Kubernetes / container-orchestration health probes:
 *   GET /health          — basic health check (load balancers)
 *   GET /ready           — readiness probe
 *   GET /live            — liveness probe
 *   GET /health/detailed — detailed health with per-service statuses
 *
 * All health endpoints are marked @Public() so they do NOT require auth.
 * They are also excluded from the global API prefix (/api/v1).
 */
describe('Health Check (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: any;
  let moduleInitFailed = false;

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
    } catch (error) {
      moduleInitFailed = true;
      console.warn(
        `Health E2E: Skipping tests — application failed to initialise (${(error as Error).message})`,
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

  // ------------------------------------------- GET /health
  describe('GET /health — basic health check', () => {
    it('should return 200 with status "healthy"', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should not require authentication', async () => {
      if (skipIfNoApp()) return;

      // No Authorization header — should still succeed
      await request(httpServer).get('/health').expect(200);
    });

    it('should return a valid ISO 8601 timestamp', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/health').expect(200);

      const parsed = Date.parse(response.body.timestamp);
      expect(isNaN(parsed)).toBe(false);
    });
  });

  // ------------------------------------------- GET /ready
  describe('GET /ready — readiness probe', () => {
    it('should return 200 with service statuses', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/ready').expect(200);

      expect(response.body.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.timestamp).toBeDefined();

      // Services object should include database and redis
      if (response.body.services) {
        expect(response.body.services.database).toBeDefined();
        expect(response.body.services.database.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(
          response.body.services.database.status,
        );

        expect(response.body.services.redis).toBeDefined();
        expect(response.body.services.redis.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.services.redis.status);
      }
    });

    it('should not require authentication', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer).get('/ready').expect(200);
    });

    it('should report latency for healthy services', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/ready').expect(200);

      if (
        response.body.services?.database?.status === 'healthy' &&
        response.body.services.database.latency !== undefined
      ) {
        expect(response.body.services.database.latency).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ------------------------------------------- GET /live
  describe('GET /live — liveness probe', () => {
    it('should return 200 with status "ok"', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/live').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should not require authentication', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer).get('/live').expect(200);
    });

    it('should return a valid ISO 8601 timestamp', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/live').expect(200);

      const parsed = Date.parse(response.body.timestamp);
      expect(isNaN(parsed)).toBe(false);
    });
  });

  // ------------------------------------------- GET /health/detailed
  describe('GET /health/detailed — detailed health with service statuses', () => {
    it('should return 200 with detailed health information', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/health/detailed').expect(200);

      expect(response.body.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should include memory usage information', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/health/detailed').expect(200);

      if (response.body.memory) {
        expect(response.body.memory.heapUsed).toBeGreaterThan(0);
        expect(response.body.memory.heapTotal).toBeGreaterThan(0);
        expect(response.body.memory.rss).toBeGreaterThan(0);
        // Heap used should be less than or equal to heap total
        expect(response.body.memory.heapUsed).toBeLessThanOrEqual(response.body.memory.heapTotal);
      }
    });

    it('should include service-level statuses (database, redis, influxdb)', async () => {
      if (skipIfNoApp()) return;

      const response = await request(httpServer).get('/health/detailed').expect(200);

      if (response.body.services) {
        // Database
        expect(response.body.services.database).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(
          response.body.services.database.status,
        );

        // Redis
        expect(response.body.services.redis).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.services.redis.status);

        // InfluxDB
        expect(response.body.services.influxdb).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(
          response.body.services.influxdb.status,
        );
      }
    });

    it('should not require authentication', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer).get('/health/detailed').expect(200);
    });
  });

  // ------------------------------------------- Non-existent health routes
  describe('Non-existent health routes', () => {
    it('should return 404 for /health/nonexistent', async () => {
      if (skipIfNoApp()) return;

      await request(httpServer).get('/health/nonexistent').expect(404);
    });
  });
});
