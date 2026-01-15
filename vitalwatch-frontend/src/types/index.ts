// User & Auth Types
export type UserRole = "patient" | "provider" | "admin" | "superadmin";

export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  organizationId?: string;
}

export interface Patient extends User {
  role: "patient";
  dateOfBirth: Date;
  conditions: string[];
  medications: Medication[];
  devices: Device[];
  providerId: string;
  emergencyContact?: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
  careTeam: string[];
}

export interface Provider extends User {
  role: "provider";
  npi: string;
  specialty: string;
  credentials: string[];
  organizationId: string;
  patients: string[];
  licenseStates: string[];
}

export interface Admin extends User {
  role: "admin" | "superadmin";
  organizationId: string;
  permissions: string[];
}

// Vital Signs Types
export type VitalType =
  | "blood_pressure"
  | "glucose"
  | "spo2"
  | "weight"
  | "heart_rate"
  | "temperature"
  | "ecg";

export type VitalStatus = "normal" | "warning" | "critical";

export interface VitalReading {
  id: string;
  patientId: string;
  deviceId: string;
  type: VitalType;
  timestamp: Date;
  values: Record<string, number>;
  unit: string;
  status: VitalStatus;
  notes?: string;
}

export interface BloodPressureReading extends VitalReading {
  type: "blood_pressure";
  values: {
    systolic: number;
    diastolic: number;
    heartRate: number;
  };
  unit: "mmHg";
}

export interface GlucoseReading extends VitalReading {
  type: "glucose";
  values: {
    glucose: number;
  };
  unit: "mg/dL";
  mealContext?: "fasting" | "before_meal" | "after_meal" | "bedtime";
}

export interface SpO2Reading extends VitalReading {
  type: "spo2";
  values: {
    spo2: number;
    heartRate: number;
  };
  unit: "%";
}

export interface WeightReading extends VitalReading {
  type: "weight";
  values: {
    weight: number;
  };
  unit: "lbs" | "kg";
}

// Device Types
export type DeviceType =
  | "blood_pressure_monitor"
  | "pulse_oximeter"
  | "glucose_meter"
  | "weight_scale"
  | "ecg_monitor";

export type DeviceStatus = "active" | "inactive" | "low_battery" | "offline";

export interface Device {
  id: string;
  serialNumber: string;
  type: DeviceType;
  model: string;
  manufacturer: string;
  status: DeviceStatus;
  batteryLevel: number;
  firmware: string;
  lastReading?: Date;
  assignedTo?: string;
  assignedAt?: Date;
}

// Alert Types
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "dismissed";

export interface Alert {
  id: string;
  patientId: string;
  providerId: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  vitalReadingId?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

// AI Types
export type AIInsightType =
  | "trend"
  | "anomaly"
  | "prediction"
  | "recommendation"
  | "correlation";

export interface AIInsight {
  id: string;
  patientId: string;
  type: AIInsightType;
  severity?: AlertSeverity;
  title: string;
  message: string;
  confidence: number;
  evidence?: string;
  recommendation?: string;
  createdAt: Date;
  vitalTypes?: VitalType[];
  data?: Record<string, unknown>;
}

export interface RiskScore {
  overall: number;
  category: "low" | "moderate" | "high" | "critical";
  breakdown: Record<string, number>;
  lastUpdated: Date;
  trend: "improving" | "stable" | "worsening";
}

// Medication Types
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: MedicationSchedule[];
  prescribedBy: string;
  prescribedAt: Date;
  refillDate?: Date;
  notes?: string;
}

export interface MedicationSchedule {
  time: string;
  taken?: boolean;
  takenAt?: Date;
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  type: "clinic" | "hospital" | "practice" | "agency";
  address: Address;
  phone: string;
  email: string;
  taxId?: string;
  npi?: string;
  subscription: Subscription;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

// Billing Types
export interface BillingRecord {
  id: string;
  patientId: string;
  providerId: string;
  organizationId: string;
  month: string;
  cptCodes: CPTCode[];
  totalAmount: number;
  status: "pending" | "submitted" | "paid" | "rejected";
  submittedAt?: Date;
  paidAt?: Date;
}

export interface CPTCode {
  code: string;
  description: string;
  amount: number;
  units: number;
  eligible: boolean;
  eligibilityReason?: string;
}

// Notification Types
export type NotificationType =
  | "alert"
  | "message"
  | "reminder"
  | "system"
  | "billing";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

// Common Types
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName: string;
  subscriberDob: Date;
}

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Dashboard Types
export interface DashboardStats {
  totalPatients: number;
  activeAlerts: number;
  adherenceRate: number;
  monthlyRevenue: number;
  trendsData: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// Integration Types
export interface IntegrationStatus {
  name: string;
  status: "active" | "inactive" | "error";
  lastSync?: Date;
  apiCalls?: number;
  errorMessage?: string;
}
