import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Clinical Documentation Integration (e2e)', () => {
  let app: INestApplication;
  let providerToken: string;
  let noteId: string;

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

  it('should create and encrypt clinical note', async () => {
    const response = await request(app.getHttpServer())
      .post('/clinical-notes')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId: 'patient-123',
        type: 'SOAP',
        title: 'Visit Note',
        content: {
          subjective: 'Patient reports improvement',
          objective: 'BP: 120/80',
          assessment: 'Stable',
          plan: 'Continue treatment',
        },
      })
      .expect(201);

    noteId = response.body.id;
    expect(response.body.encryptedContent).toBeDefined();
  });

  it('should sign clinical note', async () => {
    const response = await request(app.getHttpServer())
      .post(`/clinical-notes/${noteId}/sign`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ signature: 'Dr. Smith, MD' })
      .expect(200);

    expect(response.body.status).toBe('SIGNED');
    expect(response.body.signedAt).toBeDefined();
  });
});
