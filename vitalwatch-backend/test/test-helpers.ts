import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

/**
 * Helper to register and authenticate a user for testing
 */
export async function registerAndLogin(
  app: INestApplication,
  userData: {
    email: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
  },
): Promise<{ user: any; accessToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send(userData)
    .expect(201);

  return {
    user: response.body.user,
    accessToken: response.body.accessToken,
  };
}

/**
 * Helper to create a test patient with full profile
 */
export async function createTestPatient(app: INestApplication) {
  const { user, accessToken } = await registerAndLogin(app, {
    email: `patient-${Date.now()}@test.com`,
    password: 'SecurePass123!',
    role: 'patient',
    firstName: 'Test',
    lastName: 'Patient',
  });

  // Complete profile
  await request(app.getHttpServer())
    .patch(`/users/${user.id}/profile`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      dateOfBirth: '1980-01-01',
      phone: '+1-555-0100',
      address: {
        street: '123 Test St',
        city: 'Boston',
        state: 'MA',
        zip: '02101',
      },
    });

  return { user, accessToken };
}

/**
 * Helper to create a test provider
 */
export async function createTestProvider(app: INestApplication) {
  return registerAndLogin(app, {
    email: `provider-${Date.now()}@test.com`,
    password: 'SecurePass123!',
    role: 'provider',
    firstName: 'Dr. Test',
    lastName: 'Provider',
  });
}

/**
 * Helper to wait for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to generate random vitals data
 */
export function generateVitalsData(type: string = 'BLOOD_PRESSURE') {
  switch (type) {
    case 'BLOOD_PRESSURE':
      return {
        type: 'BLOOD_PRESSURE',
        systolic: 110 + Math.floor(Math.random() * 40),
        diastolic: 70 + Math.floor(Math.random() * 20),
        heartRate: 60 + Math.floor(Math.random() * 40),
        timestamp: new Date(),
      };
    case 'BLOOD_GLUCOSE':
      return {
        type: 'BLOOD_GLUCOSE',
        value: 80 + Math.floor(Math.random() * 100),
        timestamp: new Date(),
      };
    case 'WEIGHT':
      return {
        type: 'WEIGHT',
        value: 150 + Math.floor(Math.random() * 100),
        unit: 'lbs',
        timestamp: new Date(),
      };
    default:
      return {
        type,
        value: Math.floor(Math.random() * 100),
        timestamp: new Date(),
      };
  }
}

/**
 * Helper to create test appointment
 */
export async function createTestAppointment(
  app: INestApplication,
  token: string,
  data: any,
) {
  return request(app.getHttpServer())
    .post('/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'TELEHEALTH',
      duration: 30,
      scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      ...data,
    });
}

/**
 * Helper to create test medication
 */
export async function createTestMedication(
  app: INestApplication,
  token: string,
  data: any,
) {
  return request(app.getHttpServer())
    .post('/medications')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Medication',
      dosage: '10mg',
      frequency: 'ONCE_DAILY',
      route: 'oral',
      startDate: new Date(),
      ...data,
    });
}

/**
 * Helper to assert response structure
 */
export function assertApiResponse(response: any, expectedKeys: string[]) {
  expect(response.status).toBeLessThan(400);
  expectedKeys.forEach((key) => {
    expect(response.body).toHaveProperty(key);
  });
}

/**
 * Helper to generate test date range
 */
export function generateDateRange(days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate };
}

/**
 * Helper to mock external API calls
 */
export function mockExternalServices() {
  // Mock OpenAI
  jest.mock('openai', () => ({
    Configuration: jest.fn(),
    OpenAIApi: jest.fn().mockImplementation(() => ({
      createChatCompletion: jest.fn().mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Mock AI response' } }],
        },
      }),
    })),
  }));

  // Mock Stripe
  jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
      charges: {
        create: jest.fn().mockResolvedValue({ id: 'ch_mock', status: 'succeeded' }),
      },
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_mock' }),
      },
    }));
  });

  // Mock Twilio
  jest.mock('twilio', () => {
    return jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM_mock' }),
      },
    }));
  });
}

/**
 * Helper to clean up test data
 */
export async function cleanupTestData(app: INestApplication, userId: string) {
  // This would be implemented to clean up user-specific test data
  // For now, we rely on database cleanup between tests
}
