import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Provider Workflow Integration (e2e)', () => {
  let app: INestApplication;
  let providerToken: string;
  let providerId: string;
  let patientId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup provider and patient
    const providerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'provider@test.com',
        password: 'SecurePass123!',
        role: 'provider',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        credentials: 'MD',
        specialty: 'Internal Medicine',
      });

    providerToken = providerResponse.body.accessToken;
    providerId = providerResponse.body.user.id;

    const patientResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'patient@test.com',
        password: 'SecurePass123!',
        role: 'patient',
        firstName: 'John',
        lastName: 'Smith',
      });

    patientId = patientResponse.body.user.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  it('should view patient list', async () => {
    const response = await request(app.getHttpServer())
      .get('/providers/patients')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should review patient vitals', async () => {
    const response = await request(app.getHttpServer())
      .get(`/vitals/patient/${patientId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ days: 30 })
      .expect(200);

    expect(response.body).toHaveProperty('vitals');
    expect(response.body).toHaveProperty('trends');
  });

  it('should prescribe medication', async () => {
    const response = await request(app.getHttpServer())
      .post('/medications')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'TWICE_DAILY',
        route: 'oral',
        startDate: new Date(),
        duration: 90,
        refills: 3,
        instructions: 'Take with meals',
      })
      .expect(201);

    expect(response.body.status).toBe('ACTIVE');
  });

  it('should create clinical note', async () => {
    const response = await request(app.getHttpServer())
      .post('/clinical-notes')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        type: 'SOAP',
        title: 'Initial Consultation',
        content: {
          subjective: 'Patient reports improved energy levels',
          objective: 'BP: 130/85, HR: 75, Weight: 180 lbs',
          assessment: 'Diabetes management improving',
          plan: 'Continue current medications, follow-up in 3 months',
        },
      })
      .expect(201);

    expect(response.body.status).toBe('DRAFT');
  });

  it('should sign clinical note', async () => {
    const noteResponse = await request(app.getHttpServer())
      .post('/clinical-notes')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        type: 'PROGRESS',
        title: 'Progress Note',
        content: { notes: 'Patient progress satisfactory' },
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/clinical-notes/${noteResponse.body.id}/sign`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ signature: 'Dr. Sarah Johnson, MD' })
      .expect(200);

    expect(response.body.status).toBe('SIGNED');
  });

  it('should review and respond to messages', async () => {
    const response = await request(app.getHttpServer())
      .get('/messaging/conversations')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should create task for patient', async () => {
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        patientId,
        type: 'PATIENT_FOLLOWUP',
        title: 'Call patient to review lab results',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 86400000),
      })
      .expect(201);

    expect(response.body.status).toBe('PENDING');
  });

  it('should view provider dashboard', async () => {
    const response = await request(app.getHttpServer())
      .get('/providers/dashboard')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('patientsCount');
    expect(response.body).toHaveProperty('todayAppointments');
    expect(response.body).toHaveProperty('pendingTasks');
    expect(response.body).toHaveProperty('criticalAlerts');
  });

  it('should generate RPM billing report', async () => {
    const response = await request(app.getHttpServer())
      .get('/billing/rpm-report')
      .set('Authorization', `Bearer ${providerToken}`)
      .query({ month: '2024-01' })
      .expect(200);

    expect(response.body).toHaveProperty('eligiblePatients');
    expect(response.body).toHaveProperty('totalReimbursement');
  });
});
