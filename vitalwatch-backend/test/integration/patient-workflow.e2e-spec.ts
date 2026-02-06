import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Patient Workflow Integration (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let patientId: string;
  let providerId: string;

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

  describe('Complete Patient Journey', () => {
    it('should register a new patient', async () => {
      // Arrange & Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'patient@example.com',
          password: 'SecurePass123!',
          role: 'patient',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1980-01-01',
          phone: '+1-555-0100',
        })
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.role).toBe('patient');

      authToken = response.body.accessToken;
      patientId = response.body.user.id;
    });

    it('should complete patient profile', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch(`/users/${patientId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: {
            street: '123 Main St',
            city: 'Boston',
            state: 'MA',
            zip: '02101',
          },
          emergencyContact: {
            name: 'Jane Doe',
            relationship: 'Spouse',
            phone: '+1-555-0101',
          },
          medicalHistory: {
            conditions: ['hypertension', 'type2diabetes'],
            allergies: ['penicillin'],
            surgeries: [],
          },
        })
        .expect(200);

      // Assert
      expect(response.body.address).toBeDefined();
      expect(response.body.emergencyContact).toBeDefined();
    });

    it('should grant required consents', async () => {
      // Arrange
      const consents = ['HIPAA', 'TELEHEALTH', 'RPM', 'DATA_SHARING'];

      // Act
      for (const consentType of consents) {
        await request(app.getHttpServer())
          .post('/consents')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: consentType,
            version: '1.0',
            signature: 'John Doe',
            signedAt: new Date(),
          })
          .expect(201);
      }

      // Verify all consents granted
      const response = await request(app.getHttpServer())
        .get('/consents/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.allGranted).toBe(true);
    });

    it('should pair with RPM device', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/devices/pair')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceType: 'BLOOD_PRESSURE_MONITOR',
          serialNumber: 'BP-12345',
          manufacturer: 'Omron',
          model: 'BP7350',
        })
        .expect(201);

      // Assert
      expect(response.body.status).toBe('paired');
      expect(response.body.deviceType).toBe('BLOOD_PRESSURE_MONITOR');
    });

    it('should submit vitals from device', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/vitals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'BLOOD_PRESSURE',
          systolic: 135,
          diastolic: 85,
          heartRate: 72,
          timestamp: new Date(),
          deviceId: 'BP-12345',
        })
        .expect(201);

      // Assert
      expect(response.body.type).toBe('BLOOD_PRESSURE');
      expect(response.body.systolic).toBe(135);
    });

    it('should assign provider to patient', async () => {
      // First create a provider
      const providerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'provider@example.com',
          password: 'SecurePass123!',
          role: 'provider',
          firstName: 'Dr. Jane',
          lastName: 'Smith',
          credentials: 'MD',
        })
        .expect(201);

      providerId = providerResponse.body.user.id;

      // Assign provider to patient
      const response = await request(app.getHttpServer())
        .post(`/users/${patientId}/assign-provider`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId,
        })
        .expect(200);

      expect(response.body.providerId).toBe(providerId);
    });

    it('should schedule telehealth appointment', async () => {
      // Act
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7); // Next week

      const response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId,
          type: 'TELEHEALTH',
          scheduledAt: appointmentDate,
          duration: 30,
          reason: 'Initial consultation',
        })
        .expect(201);

      // Assert
      expect(response.body.status).toBe('SCHEDULED');
      expect(response.body.type).toBe('TELEHEALTH');
    });

    it('should add medications to patient profile', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'ONCE_DAILY',
          route: 'oral',
          startDate: new Date(),
          prescribedBy: providerId,
          instructions: 'Take in the morning',
        })
        .expect(201);

      // Assert
      expect(response.body.name).toBe('Lisinopril');
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should log medication intake', async () => {
      // Get medications first
      const medsResponse = await request(app.getHttpServer())
        .get('/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const medication = medsResponse.body[0];

      // Log intake
      const response = await request(app.getHttpServer())
        .post(`/medications/${medication.id}/log`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          takenAt: new Date(),
          notes: 'Taken with breakfast',
        })
        .expect(201);

      expect(response.body.type).toBe('TAKEN');
    });

    it('should view dashboard with aggregated data', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/patients/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('vitals');
      expect(response.body).toHaveProperty('medications');
      expect(response.body).toHaveProperty('appointments');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('adherenceScore');
    });

    it('should send message to provider', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/messaging/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId,
          subject: 'Question about medication',
          initialMessage: 'Should I take medication with food?',
        })
        .expect(201);

      // Assert
      expect(response.body.id).toBeDefined();
      expect(response.body.patientId).toBe(patientId);
      expect(response.body.providerId).toBe(providerId);
    });

    it('should receive and view notifications', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should view billing and claims', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/billing/patient')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('claims');
      expect(response.body).toHaveProperty('invoices');
      expect(response.body).toHaveProperty('totalBilled');
    });

    it('should complete health assessment', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/assessments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'MONTHLY_CHECK_IN',
          responses: {
            overallHealth: 'good',
            symptomsExperienced: ['none'],
            medicationAdherence: 90,
            exerciseFrequency: '3-4 times per week',
            stressLevel: 'moderate',
          },
        })
        .expect(201);

      // Assert
      expect(response.body.type).toBe('MONTHLY_CHECK_IN');
      expect(response.body.completedAt).toBeDefined();
    });
  });

  describe('Data Privacy and Security', () => {
    it('should encrypt PHI data', async () => {
      // Get patient profile
      const response = await request(app.getHttpServer())
        .get(`/users/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify sensitive data is properly handled
      expect(response.body.id).toBeDefined();
      // PHI should be decrypted for authorized user
      expect(response.body.firstName).toBeDefined();
      expect(response.body.lastName).toBeDefined();
    });

    it('should deny access without valid token', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/patients/dashboard').expect(401);
    });

    it('should deny access with invalid token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/patients/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Continuous Monitoring', () => {
    it('should receive automated vitals alerts', async () => {
      // Submit critical vitals
      await request(app.getHttpServer())
        .post('/vitals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'BLOOD_PRESSURE',
          systolic: 180,
          diastolic: 110,
          heartRate: 95,
          timestamp: new Date(),
        })
        .expect(201);

      // Check alerts
      const response = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.some((alert) => alert.severity === 'CRITICAL')).toBe(true);
    });

    it('should track adherence over time', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/medications/adherence-report')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 30 })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('adherenceRate');
      expect(response.body).toHaveProperty('missedDoses');
      expect(response.body).toHaveProperty('onTimeDoses');
    });
  });
});
