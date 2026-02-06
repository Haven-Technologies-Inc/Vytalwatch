import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Telehealth Visit E2E', () => {
  let app: INestApplication;
  let patientToken: string;
  let providerToken: string;
  let appointmentId: string;
  let roomId: string;

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

  it('should complete full telehealth visit', async () => {
    // 1. Schedule appointment
    const futureDate = new Date(Date.now() + 3600000);
    const apptResponse = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerId: 'provider-123',
        type: 'TELEHEALTH',
        scheduledAt: futureDate,
        duration: 30,
      })
      .expect(201);

    appointmentId = apptResponse.body.id;

    // 2. Patient checks in
    await request(app.getHttpServer())
      .post(`/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    // 3. Provider creates WebRTC room
    const roomResponse = await request(app.getHttpServer())
      .post('/webrtc/rooms')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ appointmentId })
      .expect(201);

    roomId = roomResponse.body.roomId;

    // 4. Patient joins room
    await request(app.getHttpServer())
      .post(`/webrtc/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    // 5. Exchange signaling
    await request(app.getHttpServer())
      .post(`/webrtc/rooms/${roomId}/signal`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ type: 'offer', sdp: 'mock-sdp' })
      .expect(200);

    // 6. Provider creates clinical note
    await request(app.getHttpServer())
      .post('/clinical-notes')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId: 'patient-123',
        appointmentId,
        type: 'SOAP',
        content: { subjective: 'Telehealth visit completed' },
      })
      .expect(201);

    // 7. Complete appointment
    await request(app.getHttpServer())
      .post(`/appointments/${appointmentId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);
  });
});
