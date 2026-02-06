import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Billing Workflow Integration (e2e)', () => {
  let app: INestApplication;
  let providerToken: string;
  let patientId: string;

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

  it('should create RPM claim for eligible patient', async () => {
    const response = await request(app.getHttpServer())
      .post('/claims')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        type: 'RPM',
        billingMonth: '2024-01',
        cptCodes: ['99453', '99454', '99457'],
        serviceDate: new Date('2024-01-31'),
      })
      .expect(201);

    expect(response.body.status).toBe('DRAFT');
    expect(response.body.cptCodes).toContain('99453');
  });

  it('should submit claim to insurance', async () => {
    // Create claim first
    const createResponse = await request(app.getHttpServer())
      .post('/claims')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        type: 'RPM',
        billingMonth: '2024-01',
        cptCodes: ['99453'],
      });

    const claimId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .post(`/claims/${claimId}/submit`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(response.body.status).toBe('SUBMITTED');
  });

  it('should calculate reimbursement amounts', async () => {
    const response = await request(app.getHttpServer())
      .post('/billing/calculate-reimbursement')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        cptCodes: ['99453', '99454', '99457', '99458'],
        insurancePlan: 'MEDICARE',
      })
      .expect(200);

    expect(response.body.totalAmount).toBeGreaterThan(0);
    expect(response.body.breakdown).toBeDefined();
  });

  it('should generate monthly billing summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/billing/summary')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ month: '2024-01' })
      .expect(200);

    expect(response.body).toHaveProperty('totalBilled');
    expect(response.body).toHaveProperty('totalApproved');
    expect(response.body).toHaveProperty('totalDenied');
    expect(response.body).toHaveProperty('pendingClaims');
  });
});
