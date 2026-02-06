import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Emergency Alert E2E', () => {
  let app: INestApplication;
  let patientToken: string;
  let providerToken: string;

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

  it('should handle critical vitals alert', async () => {
    // Submit critical vitals
    await request(app.getHttpServer())
      .post('/vitals')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        type: 'BLOOD_PRESSURE',
        systolic: 190,
        diastolic: 120,
        heartRate: 110,
        timestamp: new Date(),
      })
      .expect(201);

    // Verify alert created
    const alertsResponse = await request(app.getHttpServer())
      .get('/alerts')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ severity: 'CRITICAL' })
      .expect(200);

    expect(alertsResponse.body.length).toBeGreaterThan(0);
    expect(alertsResponse.body[0].severity).toBe('CRITICAL');

    // Verify push notification sent
    const notificationsResponse = await request(app.getHttpServer())
      .get('/notifications/history')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    const criticalNotif = notificationsResponse.body.find(
      (n) => n.type === 'CRITICAL_ALERT',
    );
    expect(criticalNotif).toBeDefined();
  });
});
