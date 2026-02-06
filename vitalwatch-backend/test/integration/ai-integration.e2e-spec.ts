import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('AI Integration (e2e)', () => {
  let app: INestApplication;
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

  it('should analyze patient conversation', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/analyze-conversation')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        messages: [
          { role: 'patient', content: 'I have chest pain' },
          { role: 'provider', content: 'How long?' },
        ],
      })
      .expect(200);

    expect(response.body.symptoms).toBeDefined();
    expect(response.body.urgency).toBeDefined();
  });

  it('should generate clinical summary', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/clinical-summary')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId: 'patient-123',
        vitals: [{ type: 'BP', value: '140/90' }],
        symptoms: ['headache'],
      })
      .expect(200);

    expect(response.body.summary).toBeDefined();
  });
});
