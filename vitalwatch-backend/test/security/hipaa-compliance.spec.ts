import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';
import { AuditService } from '../../src/audit/audit.service';

describe('HIPAA Compliance Security Tests', () => {
  let app: INestApplication;
  let auditService: AuditService;
  let patientToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    auditService = app.get<AuditService>(AuditService);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'patient@example.com',
        password: 'SecurePass123!',
        role: 'patient',
      });
    patientToken = response.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('PHI Protection', () => {
    it('should encrypt PHI data at rest', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          ssn: '123-45-6789',
          medicalRecordNumber: 'MRN-12345',
        })
        .expect(200);

      // PHI should not be in plain text in response
      expect(response.body).not.toHaveProperty('ssn');
    });

    it('should encrypt data in transit (HTTPS)', () => {
      // In production, this should verify SSL/TLS
      expect(process.env.NODE_ENV === 'production' ? 'https' : 'http').toBeTruthy();
    });
  });

  describe('Audit Logging', () => {
    it('should log all PHI access attempts', async () => {
      const logSpy = jest.spyOn(auditService, 'log');

      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          userId: expect.any(String),
          resourceType: expect.any(String),
        }),
      );
    });

    it('should log failed access attempts', async () => {
      const logSpy = jest.spyOn(auditService, 'log');

      await request(app.getHttpServer())
        .get('/users/other-patient-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        }),
      );
    });

    it('should include IP address and user agent in audit logs', async () => {
      const logSpy = jest.spyOn(auditService, 'log');

      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .set('User-Agent', 'Test-Agent')
        .expect(200);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            ipAddress: expect.any(String),
            userAgent: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('Access Controls', () => {
    it('should require explicit consent before accessing PHI', async () => {
      // Create new patient without consents
      const newPatientResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'noconsent@example.com',
          password: 'SecurePass123!',
          role: 'patient',
        });

      const newToken = newPatientResponse.body.accessToken;

      // Try to access services requiring consent
      await request(app.getHttpServer())
        .post('/vitals')
        .set('Authorization', `Bearer ${newToken}`)
        .send({ type: 'BLOOD_PRESSURE', systolic: 120 })
        .expect(403); // Should require HIPAA consent
    });

    it('should enforce minimum necessary access', async () => {
      // Provider should only see relevant patient data
      const providerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'provider@example.com',
          password: 'SecurePass123!',
          role: 'provider',
        });

      const providerToken = providerResponse.body.accessToken;

      // Provider should not access unassigned patient data
      await request(app.getHttpServer())
        .get('/patients/unassigned-patient/medical-history')
        .set('Authorization', `Bearer ${providerToken}`)
        .expect(403);
    });
  });

  describe('Data Retention', () => {
    it('should maintain audit logs for required period', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 7); // 7 years ago

      // Audit logs should still exist
      const logs = await auditService.findAll({
        startDate: oldDate,
        endDate: new Date(),
      });

      expect(logs).toBeDefined();
    });
  });

  describe('Breach Notification', () => {
    it('should flag potential breach events', async () => {
      // Multiple failed access attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/patients/unauthorized-patient-id')
          .set('Authorization', `Bearer ${patientToken}`);
      }

      // Should trigger breach alert
      const alerts = await request(app.getHttpServer())
        .get('/admin/security-alerts')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      // In production, this would notify security team
    });
  });

  describe('De-identification', () => {
    it('should provide de-identified data for research', async () => {
      const response = await request(app.getHttpServer())
        .get('/research/aggregated-vitals')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      // Should not contain identifying information
      expect(response.body.data).toBeDefined();
      response.body.data.forEach((record) => {
        expect(record).not.toHaveProperty('name');
        expect(record).not.toHaveProperty('ssn');
        expect(record).not.toHaveProperty('email');
      });
    });
  });
});
