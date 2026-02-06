import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Medication Adherence Integration (e2e)', () => {
  let app: INestApplication;
  let patientToken: string;
  let medicationId: string;

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

  it('should track medication adherence', async () => {
    // Create medication
    const medResponse = await request(app.getHttpServer())
      .post('/medications')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        name: 'Aspirin',
        dosage: '81mg',
        frequency: 'ONCE_DAILY',
      });

    medicationId = medResponse.body.id;

    // Log adherence
    await request(app.getHttpServer())
      .post(`/medications/${medicationId}/log`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ takenAt: new Date() })
      .expect(201);

    // Get adherence rate
    const response = await request(app.getHttpServer())
      .get(`/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${patientToken}`)
      .query({ days: 7 })
      .expect(200);

    expect(response.body.adherenceRate).toBeDefined();
  });

  it('should send medication reminders', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${patientToken}`)
      .query({ type: 'MEDICATION_REMINDER' })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
