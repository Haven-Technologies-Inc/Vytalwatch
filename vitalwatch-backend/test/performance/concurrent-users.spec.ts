import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Concurrent Users Performance', () => {
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

  it('should support 200 concurrent user sessions', async () => {
    const userTokens = [];

    // Create 200 users
    const registrationPromises = Array.from({ length: 200 }, (_, i) =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user${i}@test.com`,
          password: 'SecurePass123!',
          role: 'patient',
          firstName: `User${i}`,
          lastName: 'Test',
        }),
    );

    const results = await Promise.allSettled(registrationPromises);
    const successful = results.filter((r) => r.status === 'fulfilled');

    console.log(`Successfully registered ${successful.length}/200 users`);
    expect(successful.length).toBeGreaterThan(180);
  }, 60000);

  it('should handle mixed workload from multiple users', async () => {
    const tokens = await Promise.all(
      Array.from({ length: 50 }, async (_, i) => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `workload${i}@test.com`,
            password: 'SecurePass123!',
            role: 'patient',
          });
        return response.body.accessToken;
      }),
    );

    const startTime = Date.now();
    const operations = [];

    // Mixed operations
    tokens.forEach((token) => {
      operations.push(
        request(app.getHttpServer())
          .get('/users/profile')
          .set('Authorization', `Bearer ${token}`),
      );
      operations.push(
        request(app.getHttpServer())
          .post('/vitals')
          .set('Authorization', `Bearer ${token}`)
          .send({ type: 'BLOOD_PRESSURE', systolic: 120, diastolic: 80 }),
      );
      operations.push(
        request(app.getHttpServer())
          .get('/notifications')
          .set('Authorization', `Bearer ${token}`),
      );
    });

    await Promise.allSettled(operations);
    const duration = Date.now() - startTime;

    console.log(`150 mixed operations from 50 users: ${duration}ms`);
    console.log(`Average per operation: ${(duration / 150).toFixed(2)}ms`);

    expect(duration).toBeLessThan(10000);
  }, 30000);
});
