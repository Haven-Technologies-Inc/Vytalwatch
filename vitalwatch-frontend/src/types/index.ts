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
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLoginAt?: Date;
  organization?: string;
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
  address?: Address;
  phone?: string;
  email?: string;
  taxId?: string;
  npi?: string;
  website?: string;
  status?: "active" | "inactive" | "suspended" | "trial";
  plan?: "starter" | "professional" | "enterprise";
  subscription?: Subscription;
  userCount?: number;
  patientCount?: number;
  deviceCount?: number;
  providerCount?: number;
  monthlyRevenue?: number;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt?: Date;
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
  data: T[];
  items?: T[]; // Alias for data
  results?: T[]; // Alias for data
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

// Messaging Types
export interface MessageThread {
  id: string;
  subject?: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName?: string;
  sender?: User;
  content: string;
  attachments?: MessageAttachment[];
  readBy: string[];
  read?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

// Analytics Types
export interface DashboardAnalytics {
  totalPatients: number;
  activeAlerts: number;
  totalDevices: number;
  totalReadings: number;
  trends: {
    patients: TrendChange;
    alerts: TrendChange;
    readings: TrendChange;
    adherence: TrendChange;
  };
}

export interface TrendChange {
  change: number;
  direction: "up" | "down" | "stable";
}

export interface PopulationHealthData {
  riskDistribution: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  conditionPrevalence: Array<{
    condition: string;
    percentage: number;
  }>;
  ageDistribution: Array<{
    range: string;
    count: number;
  }>;
  totalPatients: number;
}

export interface AdherenceAnalytics {
  deviceAdherence: number;
  medicationAdherence: number;
  appointmentAdherence: number;
  overallAdherence: number;
  byWeek: Array<{
    week: string;
    adherence: number;
  }>;
}

export interface OutcomesAnalytics {
  hospitalizations: OutcomeMetric;
  emergencyVisits: OutcomeMetric;
  readmissions: OutcomeMetric;
  costSavings: {
    estimated: number;
    period: string;
  };
}

export interface OutcomeMetric {
  prevented: number;
  actual: number;
  rate: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  mrr: number;
  arr: number;
  growth: number;
  byPlan: Array<{
    plan: string;
    revenue: number;
    customers: number;
  }>;
  byCPTCode: Array<{
    code: string;
    description: string;
    count: number;
    revenue: number;
  }>;
}

export interface SystemAnalytics {
  apiHealth: {
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: number;
    queryTime: number;
    size: string;
  };
  storage: {
    used: string;
    available: string;
    percentage: number;
  };
  activeUsers: {
    current: number;
    peak: number;
    avgDaily: number;
  };
}

// Integration Configuration Types
export interface Integration {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  status: "connected" | "disconnected" | "error";
  settings?: Record<string, unknown>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
}

// Reports Types
export type ReportType =
  | "patient_summary"
  | "vitals_history"
  | "billing"
  | "compliance"
  | "population_health"
  | "custom";

export type ReportStatus = "pending" | "generating" | "completed" | "failed";

export interface Report {
  id: string;
  name?: string;
  type: ReportType;
  title?: string;
  status: ReportStatus;
  organizationId?: string;
  patientId?: string;
  createdById?: string;
  createdBy?: string;
  parameters?: Record<string, unknown>;
  format?: "pdf" | "csv" | "xlsx";
  fileUrl?: string;
  fileSize?: number;
  size?: number | string;
  frequency?: string;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  parameters: string[];
}

export interface ScheduledReport {
  id: string;
  reportType: string;
  schedule: "daily" | "weekly" | "monthly";
  recipients: string[];
  parameters?: Record<string, unknown>;
  createdAt: Date;
}

export interface PatientSummaryReport {
  patientId: string;
  generatedAt: string;
  period: { startDate?: string; endDate?: string };
  summary: {
    totalReadings: number;
    alertsGenerated: number;
    adherenceRate: number;
    riskScore: number;
  };
  vitals: Record<string, { avg: string | number; trend: string; current?: number; change?: number }>;
  recommendations: string[];
}

export interface ComplianceReport {
  organizationId: string;
  period: { startDate?: string; endDate?: string };
  metrics: {
    patientsMonitored: number;
    activeDevices: number;
    readingsPerPatient: number;
    cptCodeEligibility: Record<string, { eligible: number; percentage: number }>;
  };
}

// Admin Types
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  organizationId?: string;
  createdById: string;
  rateLimit: number;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemLog {
  id: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LogStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
}

export interface SystemSettings {
  maxPatientsPerProvider: number;
  defaultAlertThreshold: string;
  sessionTimeout: number;
  enableTwoFactor: boolean;
  retentionDays: number;
  [key: string]: unknown;
}

export interface UsageStats {
  apiRequests: {
    total: number;
    successful: number;
    failed: number;
  };
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  dataProcessed: {
    vitals: number;
    alerts: number;
    reports: number;
  };
}

export interface ApiUsage {
  totalRequests: number;
  byEndpoint: Array<{ endpoint: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
}

export interface StorageUsage {
  total: string;
  used: string;
  available: string;
  percentage: number;
  byType: Record<string, string>;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: string;
}

export interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
}

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  startedAt: Date | null;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: string;
  keys: number;
}

// Enhanced Billing Types
export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, string>;
  created: number;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault?: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface SetupIntent {
  clientSecret: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number | null;
  interval: "month" | "year";
  features: string[];
  patientLimit: number;
  providerLimit: number;
  popular?: boolean;
  custom?: boolean;
}

export interface BillingUsage {
  totalBillable: number;
  recordCount: number;
  byCode: Record<string, number>;
  period: { startDate?: string; endDate?: string };
}

export interface Invoice {
  id: string;
  userId?: string;
  organizationId?: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible" | "failed";
  amount: number;
  currency: string;
  stripeInvoiceId?: string;
  paidAt?: Date;
  dueDate?: Date;
  createdAt: Date;
}

// Enhanced AI Types
export interface AIAnalysisResult {
  analysis: string;
  riskScore: number;
  recommendations: string[];
  urgency: "low" | "medium" | "high" | "critical";
}

export interface PatientInsight {
  summary: string;
  trends: string[];
  concerns: string[];
  recommendations: string[];
  overallRiskLevel: "low" | "moderate" | "elevated" | "high";
}

export interface RiskPrediction {
  patientId: string;
  riskScore: number;
  riskLevel: "low" | "moderate" | "high";
  factors: Array<{ name: string; contribution: number }>;
  predictions: {
    hospitalization: { probability: number; timeframe: string };
    emergency: { probability: number; timeframe: string };
  };
  recommendations: string[];
  generatedAt: string;
}

export interface AIRecommendation {
  type: "medication" | "lifestyle" | "monitoring" | "activity";
  text: string;
  priority: "low" | "medium" | "high";
}

export interface AIRecommendationsResponse {
  patientId: string;
  recommendations: AIRecommendation[];
  generatedAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  type: "risk_prediction" | "vital_analysis" | "alert_classification";
  version: string;
  status: "active" | "inactive" | "training";
  accuracy: number;
  lastTrained: string;
  createdAt: string;
  metrics?: {
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
  trainingHistory?: Array<{
    version: string;
    date: string;
    accuracy: number;
  }>;
}

export interface TrainingJob {
  jobId: string;
  modelType: string;
  status: "queued" | "training" | "completed" | "failed";
  estimatedCompletion: string;
  message: string;
}

export interface AIPerformanceMetrics {
  period: { startDate?: string; endDate?: string };
  overall: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    totalPredictions: number;
    correctPredictions: number;
  };
  byModel: Array<{
    modelId: string;
    accuracy: number;
    predictions: number;
  }>;
  trend: Array<{
    date: string;
    accuracy: number;
    predictions: number;
  }>;
}

export interface BatchAnalysisJob {
  jobId: string;
  patientCount: number;
  analysisType: string;
  status: "queued" | "processing" | "completed" | "failed";
  estimatedCompletion: string;
  message: string;
}

export interface RealTimeAnalysis {
  patientId: string;
  vitalType: string;
  value: number;
  analysis: {
    isAnomalous: boolean;
    confidence: number;
    deviation: "normal" | "significant";
    trend: "stable" | "increasing" | "decreasing";
  };
  alert: {
    recommended: boolean;
    severity: AlertSeverity;
    message: string;
  } | null;
  recommendations: string[];
  processedAt: string;
  latencyMs: number;
}

// Care Plan Types
export interface CarePlan {
  id: string;
  patientId: string;
  providerId: string;
  goals: CarePlanGoal[];
  interventions: CarePlanIntervention[];
  monitoringSchedule: MonitoringSchedule;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarePlanGoal {
  id: string;
  description: string;
  targetDate: Date;
  status: "not_started" | "in_progress" | "achieved" | "not_achieved";
  metrics?: Record<string, number>;
}

export interface CarePlanIntervention {
  id: string;
  type: string;
  description: string;
  frequency: string;
  assignedTo: string;
}

export interface MonitoringSchedule {
  vitalTypes: VitalType[];
  frequency: "daily" | "twice_daily" | "weekly" | "custom";
  customSchedule?: string[];
  reminders: boolean;
}

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  type: "in_person" | "telehealth" | "phone";
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  scheduledAt: Date;
  duration: number;
  notes?: string;
  location?: string;
  telehealth_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Adherence Types
export interface AdherenceData {
  patientId: string;
  period: { startDate: string; endDate: string };
  overall: number;
  byCategory: {
    medications: number;
    vitals: number;
    appointments: number;
  };
  dailyData: Array<{
    date: string;
    score: number;
    details: Record<string, boolean>;
  }>;
}

// ==================== TENOVI TYPES ====================

export type TenoviShippingStatus =
  | "DR" // Draft
  | "RQ" // Requested
  | "PE" // Pending
  | "CR" // Created
  | "OH" // On Hold
  | "RS" // Ready to Ship
  | "SH" // Shipped
  | "DE" // Delivered
  | "RE" // Returned
  | "CA"; // Cancelled

export type TenoviWhitelistStatus = "RE" | "CO" | "PE" | "RM";

export type TenoviDeviceStatus =
  | "active"
  | "inactive"
  | "connected"
  | "disconnected"
  | "unlinked";

export interface TenoviWhitelistedDevice {
  id: string;
  sensorCode: string;
  macAddress: string;
  whitelistStatus: TenoviWhitelistStatus;
  created: string;
  modified: string;
}

export interface TenoviGatewayProperty {
  id: string;
  key: string;
  value: string;
  synced?: boolean;
  handleProperty?: boolean;
}

export interface TenoviGateway {
  id: string;
  gatewayUuid: string;
  firmwareVersion?: string;
  bootloaderVersion?: string;
  provisioned: boolean;
  lastSignalStrength?: number;
  lastCheckinTime?: string;
  assignedOn?: string;
  shippedOn?: string;
  organizationId?: string;
  patientId?: string;
  whitelistedDevices: TenoviWhitelistedDevice[];
  properties: TenoviGatewayProperty[];
  createdAt: string;
  updatedAt: string;
}

export interface TenoviPatient {
  externalId?: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  physician?: string;
  clinicName?: string;
  careManager?: string;
  smsOptIn?: boolean;
}

export interface TenoviFulfillmentRequest {
  created?: string;
  shippingStatus?: TenoviShippingStatus;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingTrackingLink?: string;
  shippedOn?: string;
  deliveredOn?: string;
  fulfilled?: boolean;
  requestedBy?: string;
  clientNotes?: string;
}

export interface TenoviDevice {
  id: string;
  name?: string;
  hardwareUuid?: string;
  sensorCode?: string;
  sensorId?: string;
  deviceType?: string;
  modelNumber?: string;
  sharedHardwareUuid?: boolean;
  fulfillmentRequest?: TenoviFulfillmentRequest;
  created?: string;
}

export interface TenoviHwiDevice {
  id: string;
  hwiDeviceId: string;
  tenoviId?: string;
  status: TenoviDeviceStatus;
  connectedOn?: string;
  unlinkedOn?: string;
  lastMeasurement?: string;
  deviceName?: string;
  hardwareUuid?: string;
  sensorCode?: string;
  sensorId?: string;
  deviceTypeId?: string;
  modelNumber?: string;
  shippingStatus?: TenoviShippingStatus;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingTrackingLink?: string;
  shippedOn?: string;
  deliveredOn?: string;
  fulfilled?: boolean;
  tenoviPatientId?: string;
  patientPhoneNumber?: string;
  patientId?: string;
  organizationId?: string;
  patientExternalId?: string;
  patientName?: string;
  patientEmail?: string;
  physician?: string;
  clinicName?: string;
  careManager?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenoviDeviceTypeMetric {
  name: string;
  primaryUnits?: string;
  primaryDisplayName?: string;
  secondaryUnits?: string;
  secondaryDisplayName?: string;
  unifiedDisplayName?: string;
  type?: "PH" | "CA";
}

export interface TenoviDeviceType {
  id: string;
  name: string;
  clientSku?: string;
  stockType?: "ST" | "CU";
  metrics?: TenoviDeviceTypeMetric[];
  sensorCode?: string;
  image?: string;
  upFrontCost?: string;
  shippingCost?: string;
  monthlyCost?: string;
  sensorIdRequired?: boolean;
  inStock?: boolean;
  virtual?: boolean;
  deprecated?: boolean;
}

export interface TenoviOrder {
  id: string;
  orderNumber?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingStatus?: TenoviShippingStatus;
  shippingTrackingLink?: string;
  fulfilled?: boolean;
  requestedBy?: string;
  shippedOn?: string;
  deliveredOn?: string;
  notifyEmails?: string;
  created?: string;
  modified?: string;
  contents?: Array<{ name: string; quantity: number; sku?: string }>;
}

export interface TenoviFulfillmentResponse {
  id: string;
  status: string;
  hwiDeviceId?: string;
  hardwareUuid?: string;
  shippingStatus?: TenoviShippingStatus;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  created?: string;
}

export interface TenoviMeasurement {
  metric: string;
  deviceName?: string;
  hwiDeviceId?: string;
  patientId?: string;
  hardwareUuid?: string;
  sensorCode?: string;
  value1?: string;
  value2?: string;
  created?: string;
  timestamp?: string;
  timezoneOffset?: number;
  estimatedTimestamp?: boolean;
}

export interface TenoviDeviceStats {
  total: number;
  active: number;
  inactive?: number;
  connected: number;
  disconnected?: number;
  unlinked?: number;
  byStatus: Record<TenoviDeviceStatus, number>;
  bySensorCode: Record<string, number>;
}

export interface TenoviSyncResult {
  synced: number;
  errors: number;
}

export interface TenoviPaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface TenoviDeviceProperty {
  id: string;
  key: string;
  value: string;
  synced?: boolean;
  handleProperty?: boolean;
}

export interface TenoviHardwareChange {
  id: string;
  created?: string;
  modified?: string;
  objectId?: string;
  deviceName?: string;
  oldHardwareUuid?: string;
  newHardwareUuid?: string;
  changer?: string;
}

export interface TenoviWebhook {
  id: string;
  created?: string;
  modified?: string;
  endpoint: string;
  authHeader?: string;
  authKey?: string;
  event?: "MEASUREMENT" | "FULFILLMENT";
  postAsArray?: boolean;
  enabledByDefault?: boolean;
}

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "VIEW"
  | "EXPORT"
  | "ASSIGN"
  | "UNASSIGN"
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "REACTIVATE";

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SoapContent {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  providerId: string;
  type: string;
  title: string;
  content?: string;
  soapContent?: SoapContent;
  signedAt?: string;
  signedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TimeTracking {
  totalMinutes: number;
  billableMinutes: number;
  notes: ClinicalNote[];
}

export interface ConsentTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  requiredFields?: string[];
}

export interface Consent {
  id: string;
  patientId: string;
  templateId: string;
  templateName?: string;
  type: string;
  status: 'pending' | 'signed' | 'revoked' | 'expired';
  signedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  signatureData?: string;
  customFields?: Record<string, string>;
  createdAt: string;
  expiresAt?: string;
}
