import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Billing Cycle E2E', () => {
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

  it('should complete full billing cycle', async () => {
    // 1. Generate monthly claims
    const generateResponse = await request(app.getHttpServer())
      .post('/billing/generate-claims')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ month: '2024-01' })
      .expect(201);

    expect(generateResponse.body.claimsCreated).toBeGreaterThan(0);

    // 2. Review and approve claims
    const claimsResponse = await request(app.getHttpServer())
      .get('/claims')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ status: 'DRAFT', month: '2024-01' })
      .expect(200);

    const claimId = claimsResponse.body[0].id;

    // 3. Submit claims
    await request(app.getHttpServer())
      .post(`/claims/${claimId}/submit`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    // 4. Process claim responses
    await request(app.getHttpServer())
      .post(`/claims/${claimId}/update-status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        status: 'APPROVED',
        approvedAmount: 135.02,
        remittanceDate: new Date(),
      })
      .expect(200);

    // 5. Generate report
    const reportResponse = await request(app.getHttpServer())
      .get('/billing/monthly-report')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ month: '2024-01' })
      .expect(200);

    expect(reportResponse.body.totalApproved).toBeGreaterThan(0);
  });
});
