import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Patient Onboarding E2E', () => {
  let app: INestApplication;

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

  it('should complete full patient onboarding flow', async () => {
    // 1. Register
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'newpatient@example.com',
        password: 'SecurePass123!',
        role: 'patient',
        firstName: 'Alice',
        lastName: 'Johnson',
      })
      .expect(201);

    const { accessToken, user } = registerResponse.body;
    expect(accessToken).toBeDefined();

    // 2. Complete profile
    await request(app.getHttpServer())
      .patch(`/users/${user.id}/profile`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dateOfBirth: '1985-05-15',
        phone: '+1-555-1234',
        address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
      })
      .expect(200);

    // 3. Grant consents
    await request(app.getHttpServer())
      .post('/consents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'HIPAA', version: '1.0', signature: 'Alice Johnson' })
      .expect(201);

    // 4. Pair device
    await request(app.getHttpServer())
      .post('/devices/pair')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceType: 'BLOOD_PRESSURE_MONITOR',
        serialNumber: 'BP-67890',
      })
      .expect(201);

    // 5. Complete initial assessment
    await request(app.getHttpServer())
      .post('/assessments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'INITIAL_HEALTH_ASSESSMENT',
        responses: { conditions: ['hypertension'], medications: [] },
      })
      .expect(201);

    // 6. Verify onboarding complete
    const statusResponse = await request(app.getHttpServer())
      .get('/users/onboarding-status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statusResponse.body.completed).toBe(true);
  });
});
