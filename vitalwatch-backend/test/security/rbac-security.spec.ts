import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('RBAC Security Tests', () => {
  let app: INestApplication;
  let patientToken: string;
  let providerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup users with different roles
    const patientResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'patient@test.com',
        password: 'SecurePass123!',
        role: 'patient',
      });
    patientToken = patientResponse.body.accessToken;

    const providerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'provider@test.com',
        password: 'SecurePass123!',
        role: 'provider',
      });
    providerToken = providerResponse.body.accessToken;

    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'SecurePass123!',
        role: 'admin',
      });
    adminToken = adminResponse.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('Patient Access Control', () => {
    it('should allow patients to view own data only', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);
    });

    it('should prevent patients from accessing other patient data', async () => {
      await request(app.getHttpServer())
        .get('/users/other-patient-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should prevent patients from accessing provider-only endpoints', async () => {
      await request(app.getHttpServer())
        .get('/providers/dashboard')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should prevent patients from creating clinical notes', async () => {
      await request(app.getHttpServer())
        .post('/clinical-notes')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId: 'patient-123',
          type: 'SOAP',
          content: {},
        })
        .expect(403);
    });
  });

  describe('Provider Access Control', () => {
    it('should allow providers to view assigned patient data', async () => {
      await request(app.getHttpServer())
        .get('/patients/assigned')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(200);
    });

    it('should prevent providers from accessing unassigned patient data', async () => {
      await request(app.getHttpServer())
        .get('/patients/unassigned-patient-id/vitals')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });

    it('should allow providers to create clinical notes', async () => {
      await request(app.getHttpServer())
        .post('/clinical-notes')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          patientId: 'assigned-patient-123',
          type: 'SOAP',
          content: {},
        })
        .expect(201);
    });

    it('should prevent providers from accessing admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });
  });

  describe('Admin Access Control', () => {
    it('should allow admins to access all endpoints', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admins to manage users', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(200);
    });
  });

  describe('Resource Ownership', () => {
    it('should prevent users from modifying resources they do not own', async () => {
      await request(app.getHttpServer())
        .patch('/medications/other-user-medication-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ dosage: '20mg' })
        .expect(403);
    });
  });
});
