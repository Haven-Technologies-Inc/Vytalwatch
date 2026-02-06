/**
 * Mock data generators for testing
 */

export const mockPatient = {
  id: 'patient-123',
  email: 'patient@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'patient',
  dateOfBirth: '1980-01-01',
  phone: '+1-555-0100',
  address: {
    street: '123 Main St',
    city: 'Boston',
    state: 'MA',
    zip: '02101',
  },
  createdAt: new Date(),
};

export const mockProvider = {
  id: 'provider-456',
  email: 'provider@example.com',
  firstName: 'Dr. Jane',
  lastName: 'Smith',
  role: 'provider',
  credentials: 'MD',
  specialty: 'Internal Medicine',
  npi: '1234567890',
  createdAt: new Date(),
};

export const mockVitals = {
  id: 'vital-789',
  patientId: 'patient-123',
  type: 'BLOOD_PRESSURE',
  systolic: 120,
  diastolic: 80,
  heartRate: 72,
  timestamp: new Date(),
  deviceId: 'device-123',
  source: 'DEVICE',
  createdAt: new Date(),
};

export const mockMedication = {
  id: 'med-123',
  patientId: 'patient-123',
  prescribedBy: 'provider-456',
  name: 'Lisinopril',
  dosage: '10mg',
  frequency: 'ONCE_DAILY',
  route: 'oral',
  startDate: new Date(),
  status: 'ACTIVE',
  refills: 3,
  instructions: 'Take with food',
  createdAt: new Date(),
};

export const mockAppointment = {
  id: 'appt-123',
  patientId: 'patient-123',
  providerId: 'provider-456',
  type: 'TELEHEALTH',
  status: 'SCHEDULED',
  scheduledAt: new Date(Date.now() + 86400000),
  duration: 30,
  reason: 'Follow-up consultation',
  createdAt: new Date(),
};

export const mockTask = {
  id: 'task-123',
  type: 'PATIENT_FOLLOWUP',
  title: 'Follow up with patient',
  description: 'Check blood pressure readings',
  patientId: 'patient-123',
  assignedTo: 'provider-456',
  createdBy: 'provider-456',
  status: 'PENDING',
  priority: 'HIGH',
  dueDate: new Date(Date.now() + 86400000),
  createdAt: new Date(),
};

export const mockClaim = {
  id: 'claim-123',
  patientId: 'patient-123',
  providerId: 'provider-456',
  type: 'RPM',
  status: 'DRAFT',
  claimNumber: 'CLM-2024-001',
  billingMonth: '2024-01',
  cptCodes: ['99453', '99454', '99457'],
  totalAmount: 135.02,
  serviceDate: new Date('2024-01-31'),
  createdAt: new Date(),
};

export const mockConsent = {
  id: 'consent-123',
  patientId: 'patient-123',
  type: 'HIPAA',
  status: 'ACTIVE',
  version: '1.0',
  grantedAt: new Date(),
  signature: 'John Doe',
  ipAddress: '192.168.1.1',
  createdAt: new Date(),
};

export const mockClinicalNote = {
  id: 'note-123',
  patientId: 'patient-123',
  createdBy: 'provider-456',
  type: 'SOAP',
  title: 'Initial Consultation',
  encryptedContent: 'encrypted-content-here',
  status: 'DRAFT',
  createdAt: new Date(),
};

export const mockMessage = {
  id: 'msg-123',
  conversationId: 'conv-123',
  senderId: 'patient-123',
  type: 'TEXT',
  status: 'SENT',
  encryptedContent: 'encrypted-message',
  iv: 'initialization-vector',
  authTag: 'auth-tag',
  createdAt: new Date(),
};

export const mockConversation = {
  id: 'conv-123',
  patientId: 'patient-123',
  providerId: 'provider-456',
  encryptionKeyId: 'key-123',
  patientUnreadCount: 0,
  providerUnreadCount: 2,
  lastMessageAt: new Date(),
  createdAt: new Date(),
};

export const mockAlert = {
  id: 'alert-123',
  patientId: 'patient-123',
  type: 'CRITICAL_VITAL',
  severity: 'CRITICAL',
  title: 'Critical Blood Pressure',
  message: 'Blood pressure reading 180/110 exceeds threshold',
  status: 'ACTIVE',
  metadata: {
    vitalId: 'vital-789',
    value: '180/110',
    threshold: '140/90',
  },
  createdAt: new Date(),
};

export const mockDeviceToken = {
  id: 'token-123',
  userId: 'patient-123',
  token: 'fcm-token-abc123',
  platform: 'ANDROID',
  deviceId: 'device-123',
  deviceName: 'Samsung Galaxy S21',
  isActive: true,
  createdAt: new Date(),
};

/**
 * Factory functions to generate mock data
 */

export function createMockPatient(overrides = {}) {
  return {
    ...mockPatient,
    id: `patient-${Date.now()}`,
    email: `patient-${Date.now()}@example.com`,
    ...overrides,
  };
}

export function createMockProvider(overrides = {}) {
  return {
    ...mockProvider,
    id: `provider-${Date.now()}`,
    email: `provider-${Date.now()}@example.com`,
    ...overrides,
  };
}

export function createMockVitals(overrides = {}) {
  return {
    ...mockVitals,
    id: `vital-${Date.now()}`,
    timestamp: new Date(),
    ...overrides,
  };
}

export function createMockMedication(overrides = {}) {
  return {
    ...mockMedication,
    id: `med-${Date.now()}`,
    ...overrides,
  };
}

export function createMockAppointment(overrides = {}) {
  return {
    ...mockAppointment,
    id: `appt-${Date.now()}`,
    scheduledAt: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

export function createMockTask(overrides = {}) {
  return {
    ...mockTask,
    id: `task-${Date.now()}`,
    ...overrides,
  };
}

export function createBulkVitals(count: number, patientId: string) {
  return Array.from({ length: count }, (_, i) => ({
    ...mockVitals,
    id: `vital-${Date.now()}-${i}`,
    patientId,
    timestamp: new Date(Date.now() - i * 3600000),
    systolic: 110 + Math.floor(Math.random() * 30),
    diastolic: 70 + Math.floor(Math.random() * 20),
  }));
}
