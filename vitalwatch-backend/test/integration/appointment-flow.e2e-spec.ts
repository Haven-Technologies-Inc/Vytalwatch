import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Appointment Flow Integration (e2e)', () => {
  let app: INestApplication;
  let patientToken: string;
  let providerToken: string;
  let appointmentId: string;

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

  it('should book appointment', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerId: 'provider-123',
        type: 'TELEHEALTH',
        scheduledAt: futureDate,
        duration: 30,
        reason: 'Follow-up',
      })
      .expect(201);

    appointmentId = response.body.id;
    expect(response.body.status).toBe('SCHEDULED');
  });

  it('should check-in for appointment', async () => {
    const response = await request(app.getHttpServer())
      .post(`/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body.status).toBe('CHECKED_IN');
  });

  it('should complete appointment', async () => {
    const response = await request(app.getHttpServer())
      .post(`/appointments/${appointmentId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ notes: 'Patient doing well' })
      .expect(200);

    expect(response.body.status).toBe('COMPLETED');
  });
});
