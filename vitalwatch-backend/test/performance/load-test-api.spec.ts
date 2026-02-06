import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('API Load Testing', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('Concurrent User Requests', () => {
    it('should handle 100 concurrent vitals submissions', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/vitals')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              type: 'BLOOD_PRESSURE',
              systolic: 120 + Math.random() * 20,
              diastolic: 80 + Math.random() * 10,
              timestamp: new Date(),
            }),
        );
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(`Duration: ${duration}ms`);
      console.log(`Successful: ${successful}, Failed: ${failed}`);
      console.log(`Throughput: ${(100 / (duration / 1000)).toFixed(2)} req/s`);

      expect(successful).toBeGreaterThan(90); // 90% success rate
      expect(duration).toBeLessThan(5000); // Should complete in 5 seconds
    });

    it('should handle 50 concurrent dashboard requests', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/patients/dashboard')
            .set('Authorization', `Bearer ${authToken}`),
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Dashboard load test duration: ${duration}ms`);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Response Time Benchmarks', () => {
    it('should respond to GET requests within 200ms', async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - startTime;

      console.log(`GET /users/profile: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });

    it('should handle complex queries within 500ms', async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/vitals/trends/patient-123')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 90, groupBy: 'day' })
        .expect(200);
      const duration = Date.now() - startTime;

      console.log(`Complex query: ${duration}ms`);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Database Performance', () => {
    it('should efficiently paginate large datasets', async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/vitals')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 100 })
        .expect(200);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(300);
    });
  });
});
