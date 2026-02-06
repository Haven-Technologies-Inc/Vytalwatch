import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('RPM Monitoring E2E', () => {
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

  it('should monitor patient vitals continuously', async () => {
    // Submit daily vitals
    for (let i = 0; i < 16; i++) {
      await request(app.getHttpServer())
        .post('/vitals')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          type: 'BLOOD_PRESSURE',
          systolic: 130 + Math.random() * 10,
          diastolic: 85 + Math.random() * 5,
          timestamp: new Date(Date.now() - i * 86400000),
        })
        .expect(201);
    }

    // Provider reviews trends
    const trendsResponse = await request(app.getHttpServer())
      .get('/vitals/trends/patient-123')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ days: 30, type: 'BLOOD_PRESSURE' })
      .expect(200);

    expect(trendsResponse.body.readings).toBeGreaterThanOrEqual(16);
    expect(trendsResponse.body.trend).toBeDefined();

    // Verify RPM billing eligibility
    const billingResponse = await request(app.getHttpServer())
      .get('/billing/rpm-eligibility/patient-123')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ month: '2024-01' })
      .expect(200);

    expect(billingResponse.body.eligible).toBe(true);
    expect(billingResponse.body.daysWithReadings).toBeGreaterThanOrEqual(16);
  });
});
