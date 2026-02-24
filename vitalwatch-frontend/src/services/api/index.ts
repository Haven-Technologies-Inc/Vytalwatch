/**
 * VitalWatch API Services
 * Organized API endpoints by domain
 */

import apiClient, { ApiError } from './client';
import type {
  User,
  Patient,
  VitalReading,
  Alert,
  Device,
  AIInsight,
  Notification,
  ApiResponse,
  PaginatedResponse,
  Organization,
  BillingRecord,
  Subscription,
  MessageThread,
  Message,
  DashboardAnalytics,
  PopulationHealthData,
  AdherenceAnalytics,
  OutcomesAnalytics,
  RevenueAnalytics,
  SystemAnalytics,
  Integration,
  EmailTemplate,
  Report,
  ReportTemplate,
  ScheduledReport,
  PatientSummaryReport,
  ComplianceReport,
  ApiKey,
  SystemLog,
  LogStats,
  SystemSettings,
  UsageStats,
  ApiUsage,
  StorageUsage,
  SystemHealth,
  ServiceHealth,
  MaintenanceStatus,
  CacheStats,
  StripeCustomer,
  PaymentMethod,
  PricingPlan,
  BillingUsage,
  Invoice,
  PatientInsight,
  RiskPrediction,
  AIRecommendationsResponse,
  AIModel,
  TrainingJob,
  AIPerformanceMetrics,
  BatchAnalysisJob,
  RealTimeAnalysis,
  CarePlan,
  Appointment,
  AdherenceData,
  Medication,
  TenoviGateway,
  TenoviHwiDevice,
  TenoviDeviceType,
  TenoviOrder,
  TenoviDeviceStats,
  TenoviSyncResult,
  TenoviPaginatedResponse,
  TenoviMeasurement,
  TenoviPatient,
  TenoviDeviceProperty,
  TenoviHardwareChange,
  TenoviWebhook,
  TenoviFulfillmentResponse,
  AuditLog,
  ClinicalNote,
  SoapContent,
  TimeTracking,
  Consent,
  ConsentTemplate,
} from '@/types';

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      '/auth/login',
      { email, password }
    ),

  register: (data: { email: string; password: string; firstName: string; lastName: string; role: string }) =>
    apiClient.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      '/auth/register',
      data
    ),

  logout: () => apiClient.post<ApiResponse<void>>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    ),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<void>>('/auth/request-password-reset', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<ApiResponse<void>>('/auth/reset-password', { token, newPassword }),

  verifyEmail: (token: string) =>
    apiClient.post<ApiResponse<void>>('/auth/verify-email', { token }),

  getCurrentUser: () =>
    apiClient.get<ApiResponse<User>>('/auth/me'),

  // SMS Verification
  sendSmsCode: (phone: string) =>
    apiClient.post<ApiResponse<void>>('/auth/send-sms-code', { phone }),

  verifySms: (phone: string, code: string) =>
    apiClient.post<ApiResponse<void>>('/auth/verify-sms', { phone, code }),

  // Social Login
  socialLogin: (provider: 'google' | 'microsoft' | 'apple', token: string) =>
    apiClient.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      `/auth/social/${provider}`,
      { token, provider }
    ),

  // Magic Link
  requestMagicLink: (email: string) =>
    apiClient.post<ApiResponse<void>>('/auth/magic-link', { email }),

  verifyMagicLink: (token: string) =>
    apiClient.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      '/auth/magic-link/verify',
      { token }
    ),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post<ApiResponse<void>>('/auth/change-password', { oldPassword, newPassword }),
};

// Users API
export const usersApi = {
  getProfile: () =>
    apiClient.get<ApiResponse<User>>('/users/profile'),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<ApiResponse<User>>('/users/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<ApiResponse<void>>('/users/change-password', { currentPassword, newPassword }),

  enableMfa: () =>
    apiClient.post<ApiResponse<{ qrCode: string; secret: string }>>('/users/mfa/enable'),

  verifyMfa: (code: string) =>
    apiClient.post<ApiResponse<void>>('/users/mfa/verify', { code }),

  disableMfa: (code: string) =>
    apiClient.post<ApiResponse<void>>('/users/mfa/disable', { code }),
};

// Patients API
export const patientsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; providerId?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Patient>>>('/patients', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Patient>>(`/patients/${id}`),

  create: (data: Partial<Patient>) =>
    apiClient.post<ApiResponse<Patient>>('/patients', data),

  update: (id: string, data: Partial<Patient>) =>
    apiClient.put<ApiResponse<Patient>>(`/patients/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/patients/${id}`),

  // Vitals
  getLatestVitals: (id: string) =>
    apiClient.get<ApiResponse<Record<string, VitalReading>>>(`/patients/${id}/vitals/latest`),

  getVitalsHistory: (id: string, params?: { type?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<VitalReading[]>>(`/patients/${id}/vitals/history`, { params }),

  getVitalsByType: (id: string, type: string, limit?: number) =>
    apiClient.get<ApiResponse<VitalReading[]>>(`/patients/${id}/vitals/${type}`, { params: limit ? { limit } : undefined }),

  // Alerts
  getAlerts: (id: string, status?: string) =>
    apiClient.get<ApiResponse<Alert[]>>(`/patients/${id}/alerts`, { params: status ? { status } : undefined }),

  getActiveAlerts: (id: string) =>
    apiClient.get<ApiResponse<Alert[]>>(`/patients/${id}/alerts/active`),

  // Devices
  getDevices: (id: string) =>
    apiClient.get<ApiResponse<Device[]>>(`/patients/${id}/devices`),

  assignDevice: (patientId: string, deviceId: string) =>
    apiClient.post<ApiResponse<void>>(`/patients/${patientId}/devices/${deviceId}/assign`),

  unassignDevice: (patientId: string, deviceId: string) =>
    apiClient.post<ApiResponse<void>>(`/patients/${patientId}/devices/${deviceId}/unassign`),

  // Medications
  getMedications: (id: string) =>
    apiClient.get<ApiResponse<Medication[]>>(`/patients/${id}/medications`),

  addMedication: (id: string, data: Partial<Medication>) =>
    apiClient.post<ApiResponse<Medication>>(`/patients/${id}/medications`, data),

  updateMedication: (patientId: string, medicationId: string, data: Partial<Medication>) =>
    apiClient.put<ApiResponse<Medication>>(`/patients/${patientId}/medications/${medicationId}`, data),

  removeMedication: (patientId: string, medicationId: string) =>
    apiClient.delete<ApiResponse<void>>(`/patients/${patientId}/medications/${medicationId}`),

  // Care Plan
  getCarePlan: (id: string) =>
    apiClient.get<ApiResponse<CarePlan>>(`/patients/${id}/care-plan`),

  updateCarePlan: (id: string, data: Partial<CarePlan>) =>
    apiClient.put<ApiResponse<CarePlan>>(`/patients/${id}/care-plan`, data),

  // AI Insights
  getAIInsights: (id: string) =>
    apiClient.get<ApiResponse<AIInsight[]>>(`/patients/${id}/ai-insights`),

  // Risk Score
  getRiskScore: (id: string) =>
    apiClient.get<ApiResponse<{ score: number; level: string; factors: Array<{ name: string; weight: number; score: number }> }>>(`/patients/${id}/risk-score`),

  // Adherence
  getAdherence: (id: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<AdherenceData>>(`/patients/${id}/adherence`, { params }),

  // Appointments
  getAppointments: (id: string, status?: string) =>
    apiClient.get<ApiResponse<Appointment[]>>(`/patients/${id}/appointments`, { params: status ? { status } : undefined }),
};

// Vitals API
export const vitalsApi = {
  getAll: (params?: { patientId?: string; type?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<VitalReading>>>('/vitals', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<VitalReading>>(`/vitals/${id}`),

  create: (data: Partial<VitalReading>) =>
    apiClient.post<ApiResponse<VitalReading>>('/vitals', data),

  getLatest: (patientId: string) =>
    apiClient.get<ApiResponse<Record<string, VitalReading>>>(`/vitals/latest/${patientId}`),

  getTrends: (patientId: string, type: string, days?: number) =>
    apiClient.get<ApiResponse<VitalReading[]>>(`/vitals/trends/${patientId}`, { params: { type, days: days ?? 30 } }),
};

// Alerts API
export const alertsApi = {
  getAll: (params?: { status?: string; severity?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Alert>>>('/alerts', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Alert>>(`/alerts/${id}`),

  acknowledge: (id: string) =>
    apiClient.post<ApiResponse<Alert>>(`/alerts/${id}/acknowledge`),

  resolve: (id: string, resolution: string) =>
    apiClient.post<ApiResponse<Alert>>(`/alerts/${id}/resolve`, { resolution }),

  dismiss: (id: string) =>
    apiClient.post<ApiResponse<Alert>>(`/alerts/${id}/dismiss`),

  getStats: () =>
    apiClient.get<ApiResponse<{ active: number; acknowledged: number; resolved: number }>>('/alerts/stats'),
};

// Devices API
export const devicesApi = {
  getAll: (params?: { status?: string; type?: string }) =>
    apiClient.get<ApiResponse<Device[]>>('/devices', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Device>>(`/devices/${id}`),

  assign: (deviceId: string, patientId: string) =>
    apiClient.post<ApiResponse<Device>>(`/devices/${deviceId}/assign`, { patientId }),

  unassign: (deviceId: string) =>
    apiClient.post<ApiResponse<Device>>(`/devices/${deviceId}/unassign`),

  getReadings: (deviceId: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<VitalReading[]>>(`/devices/${deviceId}/readings`, { params }),
};

// AI API
export const aiApi = {
  // Chat
  chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    apiClient.post<ApiResponse<{ response: string }>>('/ai/chat', { messages }),

  // Vitals Analysis
  analyzeVitals: (vitals: VitalReading[]) =>
    apiClient.post<ApiResponse<{ analyses: AIInsight[] }>>('/ai/analyze-vitals', { vitals }),

  // Patient Insight
  getPatientInsight: (patientId: string, vitals: VitalReading[], alerts: Alert[]) =>
    apiClient.post<ApiResponse<PatientInsight>>('/ai/patient-insight', { patientId, vitals, alerts }),

  // Health Summary
  getHealthSummary: (vitals: VitalReading[], alerts: Alert[]) =>
    apiClient.post<ApiResponse<{ summary: string }>>('/ai/health-summary', { vitals, alerts }),

  // Insights
  getInsights: (patientId: string) =>
    apiClient.get<ApiResponse<AIInsight[]>>(`/ai/insights/${patientId}`),

  // Risk Prediction
  predictRisk: (data: { patientId: string; vitals?: VitalReading[]; conditions?: string[] }) =>
    apiClient.post<ApiResponse<RiskPrediction>>('/ai/predict-risk', data),

  // Recommendations
  getRecommendations: (patientId: string, type?: string) =>
    apiClient.get<ApiResponse<AIRecommendationsResponse>>(`/ai/recommendations/${patientId}`, { params: type ? { type } : undefined }),

  // Model Management
  trainModel: (data: { modelType: string; trainingData?: Record<string, unknown>; parameters?: Record<string, unknown> }) =>
    apiClient.post<ApiResponse<TrainingJob>>('/ai/train', data),

  getModels: (status?: string) =>
    apiClient.get<ApiResponse<AIModel[]>>('/ai/models', { params: status ? { status } : undefined }),

  getModel: (id: string) =>
    apiClient.get<ApiResponse<AIModel>>(`/ai/models/${id}`),

  activateModel: (id: string) =>
    apiClient.post<ApiResponse<{ id: string; status: string; activatedAt: string }>>(`/ai/models/${id}/activate`),

  deactivateModel: (id: string) =>
    apiClient.post<ApiResponse<{ id: string; status: string; deactivatedAt: string }>>(`/ai/models/${id}/deactivate`),

  // Performance Metrics
  getPerformanceMetrics: (params?: { modelId?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<AIPerformanceMetrics>>('/ai/performance-metrics', { params }),

  // Batch Analysis
  batchAnalyze: (data: { patientIds: string[]; analysisType: string }) =>
    apiClient.post<ApiResponse<BatchAnalysisJob>>('/ai/batch-analyze', data),

  // Real-time Analysis
  realTimeAnalysis: (data: { vitalReading: VitalReading; patientId: string }) =>
    apiClient.post<ApiResponse<RealTimeAnalysis>>('/ai/real-time', data),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: { read?: boolean; type?: string }) =>
    apiClient.get<ApiResponse<Notification[]>>('/notifications', { params }),

  markAsRead: (id: string) =>
    apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.post<ApiResponse<void>>('/notifications/read-all'),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),
};

// Billing API
export const billingApi = {
  // Subscriptions
  createSubscription: (data: { userId: string; organizationId?: string; plan: string; paymentMethodId?: string }) =>
    apiClient.post<ApiResponse<Subscription>>('/billing/subscriptions', data),

  getCurrentSubscription: () =>
    apiClient.get<ApiResponse<Subscription>>('/billing/subscriptions/current'),

  getSubscription: (id: string) =>
    apiClient.get<ApiResponse<Subscription>>(`/billing/subscriptions/${id}`),

  cancelSubscription: (id: string) =>
    apiClient.post<ApiResponse<Subscription>>(`/billing/subscriptions/${id}/cancel`),

  // Billing Records
  createBillingRecord: (data: { patientId: string; providerId: string; cptCode: string; serviceDate: string }) =>
    apiClient.post<ApiResponse<BillingRecord>>('/billing/records', data),

  getRecords: (params?: { patientId?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<{ records: BillingRecord[]; total: number }>>('/billing/records', { params }),

  submitBillingRecord: (id: string) =>
    apiClient.put<ApiResponse<BillingRecord>>(`/billing/records/${id}/submit`),

  getStats: () =>
    apiClient.get<ApiResponse<{ totalRevenue: number; pendingAmount: number; recordsByStatus: Record<string, number>; recordsByCPT: Record<string, number> }>>('/billing/stats'),

  // Invoices
  getInvoices: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<{ invoices: Invoice[]; total: number }>>('/billing/invoices', { params }),

  getInvoice: (id: string) =>
    apiClient.get<ApiResponse<Invoice>>(`/billing/invoices/${id}`),

  // Customer
  createCustomer: (data: { email: string; name: string; organizationId?: string }) =>
    apiClient.post<ApiResponse<StripeCustomer>>('/billing/create-customer', data),

  getCustomer: (id: string) =>
    apiClient.get<ApiResponse<StripeCustomer>>(`/billing/customer/${id}`),

  getCurrentCustomer: () =>
    apiClient.get<ApiResponse<StripeCustomer>>('/billing/customer'),

  // Checkout
  createCheckoutSession: (data: { priceId: string; successUrl: string; cancelUrl: string }) =>
    apiClient.post<ApiResponse<{ sessionId: string; url: string }>>('/billing/create-checkout-session', data),

  // Payment Methods
  getPaymentMethods: () =>
    apiClient.get<ApiResponse<PaymentMethod[]>>('/billing/payment-methods'),

  addPaymentMethod: (paymentMethodId: string) =>
    apiClient.post<ApiResponse<PaymentMethod>>('/billing/payment-methods', { paymentMethodId }),

  deletePaymentMethod: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/billing/payment-methods/${id}`),

  setDefaultPaymentMethod: (id: string) =>
    apiClient.put<ApiResponse<{ success: boolean }>>(`/billing/payment-methods/${id}/default`),

  // Usage
  getUsage: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<BillingUsage>>('/billing/usage', { params }),

  // Plans
  getPricingPlans: () =>
    apiClient.get<ApiResponse<PricingPlan[]>>('/billing/plans'),

  getPricingPlan: (id: string) =>
    apiClient.get<ApiResponse<PricingPlan>>(`/billing/plans/${id}`),

  // Setup Intent
  createSetupIntent: () =>
    apiClient.post<ApiResponse<{ clientSecret: string }>>('/billing/setup-intent'),
};

// Organizations API
export const organizationsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Organization>>>('/organizations', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Organization>>(`/organizations/${id}`),

  create: (data: Partial<Organization>) =>
    apiClient.post<ApiResponse<Organization>>('/organizations', data),

  update: (id: string, data: Partial<Organization>) =>
    apiClient.put<ApiResponse<Organization>>(`/organizations/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/organizations/${id}`),

  // Users
  getUsers: (id: string, role?: string) =>
    apiClient.get<ApiResponse<User[]>>(`/organizations/${id}/users`, { params: role ? { role } : undefined }),

  addUser: (orgId: string, userId: string) =>
    apiClient.post<ApiResponse<void>>(`/organizations/${orgId}/users/${userId}`),

  removeUser: (orgId: string, userId: string) =>
    apiClient.delete<ApiResponse<void>>(`/organizations/${orgId}/users/${userId}`),

  // Patients
  getPatients: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Patient>>>(`/organizations/${id}/patients`, { params }),

  // Devices
  getDevices: (id: string) =>
    apiClient.get<ApiResponse<Device[]>>(`/organizations/${id}/devices`),

  // Billing
  getBilling: (id: string) =>
    apiClient.get<ApiResponse<{ subscription: Subscription; usage: BillingUsage }>>(`/organizations/${id}/billing`),

  // Analytics
  getAnalytics: (id: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<DashboardAnalytics>>(`/organizations/${id}/analytics`, { params }),

  // Settings
  getSettings: (id: string) =>
    apiClient.get<ApiResponse<Record<string, unknown>>>(`/organizations/${id}/settings`),

  updateSettings: (id: string, settings: Record<string, unknown>) =>
    apiClient.put<ApiResponse<Record<string, unknown>>>(`/organizations/${id}/settings`, settings),
};

// Messaging API
export const messagingApi = {
  getThreads: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<MessageThread>>>('/messages/threads', { params }),

  getThread: (id: string) =>
    apiClient.get<ApiResponse<MessageThread>>(`/messages/threads/${id}`),

  createThread: (participantIds: string[], subject?: string) =>
    apiClient.post<ApiResponse<MessageThread>>('/messages/threads', { participantIds, subject }),

  getMessages: (threadId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Message>>>(`/messages/threads/${threadId}/messages`, { params }),

  sendMessage: (threadId: string, content: string, attachments?: string[]) =>
    apiClient.post<ApiResponse<Message>>(`/messages/threads/${threadId}/messages`, { content, attachments }),

  markThreadAsRead: (threadId: string) =>
    apiClient.put<ApiResponse<void>>(`/messages/threads/${threadId}/read`),

  markMessageAsRead: (messageId: string) =>
    apiClient.put<ApiResponse<void>>(`/messages/messages/${messageId}/read`),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ unreadCount: number }>>('/messages/unread-count'),

  deleteThread: (threadId: string) =>
    apiClient.delete<ApiResponse<void>>(`/messages/threads/${threadId}`),

  deleteMessage: (messageId: string) =>
    apiClient.delete<ApiResponse<void>>(`/messages/messages/${messageId}`),
};

// Analytics API
export const analyticsApi = {
  getDashboard: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<DashboardAnalytics>>('/analytics/dashboard', { params }),

  getPopulationHealth: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<PopulationHealthData>>('/analytics/population-health', { params }),

  getAdherence: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<AdherenceAnalytics>>('/analytics/adherence', { params }),

  getOutcomes: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<OutcomesAnalytics>>('/analytics/outcomes', { params }),

  getRevenue: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<RevenueAnalytics>>('/analytics/revenue', { params }),

  getSystem: () =>
    apiClient.get<ApiResponse<SystemAnalytics>>('/analytics/system'),

  exportData: (type: string, format?: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<{ downloadUrl: string }>>('/analytics/export', { params: { type, ...(format && { format }), ...params } }),
};

// Integrations API
export const integrationsApi = {
  list: () =>
    apiClient.get<ApiResponse<Integration[]>>('/integrations'),

  get: (name: string) =>
    apiClient.get<ApiResponse<Integration>>(`/integrations/${name}`),

  configure: (name: string, config: Record<string, unknown>) =>
    apiClient.put<ApiResponse<Integration>>(`/integrations/${name}/configure`, config),

  enable: (name: string) =>
    apiClient.post<ApiResponse<Integration>>(`/integrations/${name}/enable`),

  disable: (name: string) =>
    apiClient.post<ApiResponse<Integration>>(`/integrations/${name}/disable`),

  test: (name: string, testData?: Record<string, unknown>) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/integrations/${name}/test`, testData),

  // Zoho
  sendEmail: (to: string, subject: string, body: string, html?: boolean) =>
    apiClient.post<ApiResponse<{ messageId: string }>>('/integrations/zoho/send-email', { to, subject, body, html }),

  getEmailTemplates: () =>
    apiClient.get<ApiResponse<EmailTemplate[]>>('/integrations/zoho/templates'),

  // OpenAI
  analyzeWithOpenAI: (prompt: string, context?: string) =>
    apiClient.post<ApiResponse<{ analysis: string; confidence: number; timestamp: string }>>('/integrations/openai/analyze', { prompt, context }),

  generateInsight: (patientId: string, vitalData: VitalReading[]) =>
    apiClient.post<ApiResponse<PatientInsight>>('/integrations/openai/generate-insight', { patientId, vitalData }),

  // Grok
  analyzeWithGrok: (data: Record<string, unknown>, analysisType: string) =>
    apiClient.post<ApiResponse<{ result: string; analysisType: string; timestamp: string }>>('/integrations/grok/analyze', { data, analysisType }),

  grokRealTime: (vitalReading: VitalReading) =>
    apiClient.post<ApiResponse<RealTimeAnalysis>>('/integrations/grok/real-time', { vitalReading }),

  // Twilio
  sendSms: (to: string, message: string) =>
    apiClient.post<ApiResponse<{ messageId: string }>>('/integrations/twilio/send-sms', { to, message }),

  getSmsStatus: (messageId: string) =>
    apiClient.get<ApiResponse<{ messageId: string; status: string; deliveredAt?: string }>>(`/integrations/twilio/status/${messageId}`),

  // Tenovi (legacy - use tenoviApi for full functionality)
  getTenoviDevices: () =>
    apiClient.get<ApiResponse<Device[]>>('/integrations/tenovi/devices'),

  syncTenoviDevices: () =>
    apiClient.post<ApiResponse<{ success: boolean; syncedDevices: number; timestamp: string }>>('/integrations/tenovi/sync'),
};

// Tenovi API - Full Integration
export const tenoviApi = {
  // Gateways
  listGateways: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviGateway>>>('/tenovi/gateways', { params }),

  listLocalGateways: (params?: { page?: number; limit?: number; organizationId?: string }) =>
    apiClient.get<ApiResponse<{ data: TenoviGateway[]; total: number }>>('/tenovi/gateways/local', { params }),

  getGateway: (uuid: string) =>
    apiClient.get<ApiResponse<TenoviGateway>>(`/tenovi/gateways/${uuid}`),

  getOrganizationGateways: (organizationId: string) =>
    apiClient.get<ApiResponse<TenoviGateway[]>>(`/tenovi/gateways/organization/${organizationId}`),

  syncGateway: (uuid: string) =>
    apiClient.post<ApiResponse<TenoviGateway>>(`/tenovi/gateways/${uuid}/sync`),

  unlinkGateway: (gatewayId: string) =>
    apiClient.post<ApiResponse<void>>(`/tenovi/gateways/${gatewayId}/unlink`),

  // HWI Devices
  listDevices: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviHwiDevice>>>('/tenovi/devices', { params }),

  listLocalDevices: (params?: { page?: number; limit?: number; status?: string; sensorCode?: string; organizationId?: string; patientId?: string; unassignedOnly?: boolean }) =>
    apiClient.get<ApiResponse<{ data: TenoviHwiDevice[]; total: number }>>('/tenovi/devices/local', { params }),

  getDevice: (hwiDeviceId: string) =>
    apiClient.get<ApiResponse<TenoviHwiDevice>>(`/tenovi/devices/${hwiDeviceId}`),

  getPatientDevices: (patientId: string) =>
    apiClient.get<ApiResponse<TenoviHwiDevice[]>>(`/tenovi/devices/patient/${patientId}`),

  getOrganizationDevices: (organizationId: string) =>
    apiClient.get<ApiResponse<TenoviHwiDevice[]>>(`/tenovi/devices/organization/${organizationId}`),

  syncDevice: (hwiDeviceId: string) =>
    apiClient.post<ApiResponse<TenoviHwiDevice>>(`/tenovi/devices/${hwiDeviceId}/sync`),

  assignDevice: (hwiDeviceId: string, patientId: string, organizationId?: string) =>
    apiClient.post<ApiResponse<TenoviHwiDevice>>(`/tenovi/devices/${hwiDeviceId}/assign`, {
      patientId,
      organizationId,
    }),

  unassignDevice: (hwiDeviceId: string) =>
    apiClient.post<ApiResponse<TenoviHwiDevice>>(`/tenovi/devices/${hwiDeviceId}/unassign`),

  // Device Measurements
  getDeviceMeasurements: (hwiDeviceId: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviMeasurement>>>(`/tenovi/devices/${hwiDeviceId}/measurements`, { params }),

  getPatientMeasurements: (externalId: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviMeasurement>>>(`/tenovi/patients/${externalId}/measurements`, { params }),

  // Device Properties
  getDeviceProperties: (hwiDeviceId: string) =>
    apiClient.get<ApiResponse<TenoviDeviceProperty[]>>(`/tenovi/devices/${hwiDeviceId}/properties`),

  updateDeviceProperty: (hwiDeviceId: string, propertyId: string, value: string) =>
    apiClient.patch<ApiResponse<TenoviDeviceProperty>>(`/tenovi/devices/${hwiDeviceId}/properties/${propertyId}`, { value }),

  // HWI Patients
  listHwiPatients: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviPatient>>>('/tenovi/hwi-patients', { params }),

  getHwiPatient: (externalId: string) =>
    apiClient.get<ApiResponse<TenoviPatient>>(`/tenovi/hwi-patients/${externalId}`),

  createHwiPatient: (data: Partial<TenoviPatient>) =>
    apiClient.post<ApiResponse<TenoviPatient>>('/tenovi/hwi-patients', data),

  updateHwiPatient: (externalId: string, data: Partial<TenoviPatient>) =>
    apiClient.patch<ApiResponse<TenoviPatient>>(`/tenovi/hwi-patients/${externalId}`, data),

  deleteHwiPatient: (externalId: string) =>
    apiClient.delete<ApiResponse<void>>(`/tenovi/hwi-patients/${externalId}`),

  // Device Types
  listDeviceTypes: () =>
    apiClient.get<ApiResponse<TenoviDeviceType[]>>('/tenovi/device-types'),

  // Bulk Orders
  listBulkOrders: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviOrder>>>('/tenovi/bulk-orders', { params }),

  getBulkOrder: (orderId: string) =>
    apiClient.get<ApiResponse<TenoviOrder>>(`/tenovi/bulk-orders/${orderId}`),

  createBulkOrder: (data: { shippingName: string; shippingAddress: string; shippingCity: string; shippingState: string; shippingZipCode: string; notifyEmails?: string; contents: Array<{ name: string; quantity: number }> }) =>
    apiClient.post<ApiResponse<TenoviOrder>>('/tenovi/bulk-orders', data),

  // Device Replacements
  listReplacements: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviHardwareChange>>>('/tenovi/replacements', { params }),

  getReplacement: (replacementId: string) =>
    apiClient.get<ApiResponse<TenoviHardwareChange>>(`/tenovi/replacements/${replacementId}`),

  createReplacement: (data: { hwiDeviceId: string; newHardwareUuid: string; reason?: string }) =>
    apiClient.post<ApiResponse<TenoviHardwareChange>>('/tenovi/replacements', data),

  // Sync Operations
  syncAll: (organizationId?: string) =>
    apiClient.post<ApiResponse<TenoviSyncResult>>('/tenovi/sync', { organizationId }),

  // Statistics
  getStats: (organizationId?: string) =>
    apiClient.get<ApiResponse<TenoviDeviceStats>>('/tenovi/stats', {
      params: organizationId ? { organizationId } : undefined,
    }),

  // Webhooks Management
  listWebhooks: () =>
    apiClient.get<ApiResponse<TenoviWebhook[]>>('/tenovi/webhooks'),

  createWebhook: (endpoint: string, event: 'MEASUREMENT' | 'FULFILLMENT') =>
    apiClient.post<ApiResponse<TenoviWebhook>>('/tenovi/webhooks', { endpoint, event }),

  resendWebhooks: (params: { webhookIds?: string[]; startDate?: string; endDate?: string; hwiDeviceId?: string }) =>
    apiClient.post<ApiResponse<{ resent: number }>>('/tenovi/webhooks/resend', params),

  testWebhooks: (webhookIds: string[], event: 'MEASUREMENT' | 'FULFILLMENT') =>
    apiClient.post<ApiResponse<{ tested: number; results: unknown[] }>>('/tenovi/webhooks/test', { webhookIds, event }),

  // Hardware UUID Logs
  getHardwareUuidLogs: (params?: { page?: number; limit?: number; hwiDeviceId?: string }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviHardwareChange>>>('/tenovi/hardware-logs', { params }),

  // Legacy orders endpoint (deprecated - use listBulkOrders)
  listOrders: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<TenoviPaginatedResponse<TenoviOrder>>>('/tenovi/bulk-orders', { params }),

  getOrder: (orderId: string) =>
    apiClient.get<ApiResponse<TenoviOrder>>(`/tenovi/bulk-orders/${orderId}`),

  // Fulfillment Requests (Individual patient device orders)
  createFulfillmentRequest: (data: {
    shippingName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingState: string;
    shippingZipCode: string;
    notifyEmails?: string;
    requireSignature?: boolean;
    shipGatewayOnly?: boolean;
    clientNotes?: string;
    deviceTypes?: string[];
    patientId?: string;
  }) => apiClient.post<ApiResponse<TenoviFulfillmentResponse>>('/tenovi/fulfillment/create', data),

  // Patient device order (wrapper for fulfillment)
  createOrder: (data: {
    patientId: string;
    deviceTypes: string[];
    shippingAddress: { name: string; street: string; city: string; state: string; zipCode: string };
    notifyEmails?: string;
  }) => apiClient.post<ApiResponse<TenoviFulfillmentResponse>>('/tenovi/fulfillment/create', {
    shippingName: data.shippingAddress.name,
    shippingAddress: data.shippingAddress.street,
    shippingCity: data.shippingAddress.city,
    shippingState: data.shippingAddress.state,
    shippingZipCode: data.shippingAddress.zipCode,
    deviceTypes: data.deviceTypes,
    patientId: data.patientId,
    notifyEmails: data.notifyEmails,
  }),
};

// Reports API
export const reportsApi = {
  getAll: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Report>>>('/reports', { params }),

  getTemplates: () =>
    apiClient.get<ApiResponse<ReportTemplate[]>>('/reports/templates'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Report>>(`/reports/${id}`),

  generate: (data: {
    type: string;
    title?: string;
    patientId?: string;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    format?: string;
    parameters?: Record<string, unknown>;
  }) => apiClient.post<ApiResponse<Report>>('/reports/generate', data),

  download: (id: string) =>
    apiClient.get<Blob>(`/reports/${id}/download`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/reports/${id}`),

  // Scheduled Reports
  getScheduled: () =>
    apiClient.get<ApiResponse<ScheduledReport[]>>('/reports/scheduled'),

  schedule: (data: { reportType: string; schedule: string; recipients: string[]; parameters?: Record<string, unknown> }) =>
    apiClient.post<ApiResponse<ScheduledReport>>('/reports/schedule', data),

  cancelScheduled: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/reports/scheduled/${id}`),

  // Patient Reports
  getPatientSummary: (patientId: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<PatientSummaryReport>>(`/reports/patient/${patientId}/summary`, { params }),

  getPatientVitalsReport: (patientId: string, params?: { type?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<{ patientId: string; vitals: VitalReading[]; period: { startDate?: string; endDate?: string } }>>(`/reports/patient/${patientId}/vitals`, { params }),

  // Organization Reports
  getComplianceReport: (orgId: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<ComplianceReport>>(`/reports/organization/${orgId}/compliance`, { params }),

  getBillingReport: (orgId: string, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<{ organizationId: string; period: { startDate?: string; endDate?: string }; records: BillingRecord[]; totals: Record<string, number> }>>(`/reports/organization/${orgId}/billing`, { params }),
};

// Admin API
export const adminApi = {
  // API Keys
  getApiKeys: () =>
    apiClient.get<ApiResponse<ApiKey[]>>('/admin/api-keys'),

  getApiKey: (id: string) =>
    apiClient.get<ApiResponse<ApiKey>>(`/admin/api-keys/${id}`),

  createApiKey: (data: { name: string; scopes?: string[]; expiresAt?: string; rateLimit?: number }) =>
    apiClient.post<ApiResponse<ApiKey & { key: string }>>('/admin/api-keys', data),

  updateApiKey: (id: string, data: Partial<ApiKey>) =>
    apiClient.put<ApiResponse<ApiKey>>(`/admin/api-keys/${id}`, data),

  deleteApiKey: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/admin/api-keys/${id}`),

  regenerateApiKey: (id: string) =>
    apiClient.post<ApiResponse<ApiKey & { key: string }>>(`/admin/api-keys/${id}/regenerate`),

  // Logs
  getLogs: (params?: { page?: number; limit?: number; level?: string; source?: string; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<SystemLog>>>('/admin/logs', { params }),

  getLogEntry: (id: string) =>
    apiClient.get<ApiResponse<SystemLog>>(`/admin/logs/${id}`),

  getLogStats: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<LogStats>>('/admin/logs/stats', { params }),

  // Settings
  getSettings: () =>
    apiClient.get<ApiResponse<SystemSettings>>('/admin/settings'),

  getSetting: (key: string) =>
    apiClient.get<ApiResponse<{ key: string; value: unknown }>>(`/admin/settings/${key}`),

  updateSetting: (key: string, value: unknown) =>
    apiClient.put<ApiResponse<{ key: string; value: unknown }>>('/admin/settings', { key, value }),

  updateSettingsBulk: (settings: Record<string, unknown>) =>
    apiClient.put<ApiResponse<SystemSettings>>('/admin/settings/bulk', settings),

  // Usage
  getUsageStats: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<UsageStats>>('/admin/usage', { params }),

  getApiUsage: (params?: { startDate?: string; endDate?: string; groupBy?: string }) =>
    apiClient.get<ApiResponse<ApiUsage>>('/admin/usage/api', { params }),

  getStorageUsage: () =>
    apiClient.get<ApiResponse<StorageUsage>>('/admin/usage/storage'),

  // System Health
  getSystemHealth: () =>
    apiClient.get<ApiResponse<SystemHealth>>('/admin/health'),

  getDatabaseHealth: () =>
    apiClient.get<ApiResponse<ServiceHealth>>('/admin/health/database'),

  getServicesHealth: () =>
    apiClient.get<ApiResponse<Record<string, ServiceHealth>>>('/admin/health/services'),

  // User Management
  getPendingUsers: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<User>>>('/admin/users/pending', { params }),

  approveUser: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/admin/users/${id}/approve`),

  rejectUser: (id: string, reason?: string) =>
    apiClient.post<ApiResponse<void>>(`/admin/users/${id}/reject`, { reason }),

  suspendUser: (id: string, reason?: string) =>
    apiClient.post<ApiResponse<void>>(`/admin/users/${id}/suspend`, { reason }),

  reactivateUser: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/admin/users/${id}/reactivate`),

  // Maintenance
  enableMaintenanceMode: (message?: string, estimatedDuration?: number) =>
    apiClient.post<ApiResponse<MaintenanceStatus>>('/admin/maintenance/enable', { message, estimatedDuration }),

  disableMaintenanceMode: () =>
    apiClient.post<ApiResponse<MaintenanceStatus>>('/admin/maintenance/disable'),

  getMaintenanceStatus: () =>
    apiClient.get<ApiResponse<MaintenanceStatus>>('/admin/maintenance/status'),

  // Cache
  clearCache: (pattern?: string) =>
    apiClient.post<ApiResponse<{ cleared: number; pattern?: string }>>('/admin/cache/clear', { pattern }),

  getCacheStats: () =>
    apiClient.get<ApiResponse<CacheStats>>('/admin/cache/stats'),
};

// Audit API
export const auditApi = {
  // Get all audit logs with filters
  getAll: (params?: {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit', { params }),

  // Get audit logs for a specific user
  getByUser: (userId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(`/audit/user/${userId}`, { params }),

  // Get audit logs for a specific resource
  getByResource: (resourceType: string, resourceId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(`/audit/resource/${resourceType}/${resourceId}`, { params }),

  // Get recent activity for an organization
  getRecentActivity: (organizationId: string, limit?: number) =>
    apiClient.get<ApiResponse<AuditLog[]>>(`/audit/recent/${organizationId}`, { params: limit ? { limit } : undefined }),

  // Get login history for a user
  getLoginHistory: (userId: string, limit?: number) =>
    apiClient.get<ApiResponse<AuditLog[]>>(`/audit/login-history/${userId}`, { params: limit ? { limit } : undefined }),

  // Get security events for an organization
  getSecurityEvents: (organizationId: string, startDate: string, endDate: string) =>
    apiClient.get<ApiResponse<AuditLog[]>>(`/audit/security/${organizationId}`, { params: { startDate, endDate } }),
};

// Users Admin API (extends usersApi for admin operations)
export const usersAdminApi = {
  // List all users (admin only)
  getAll: (params?: { organizationId?: string; role?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<User>>>('/users', { params }),

  // Get user by ID
  getById: (id: string) =>
    apiClient.get<ApiResponse<User>>(`/users/${id}`),

  // Update user (admin)
  update: (id: string, data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data),

  // Delete user (superadmin only)
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/users/${id}`),

  // Deactivate user
  deactivate: (id: string) =>
    apiClient.post<ApiResponse<User>>(`/users/${id}/deactivate`),

  // Get patients by provider
  getPatientsByProvider: (providerId: string) =>
    apiClient.get<ApiResponse<Patient[]>>(`/users/provider/${providerId}/patients`),

  // Assign patient to provider
  assignPatientToProvider: (patientId: string, providerId: string) =>
    apiClient.post<ApiResponse<void>>(`/users/patients/${patientId}/assign/${providerId}`),

  // Invite user
  inviteUser: (data: { email: string; role: string; organizationId?: string }) =>
    apiClient.post<ApiResponse<{ inviteId: string; expiresAt: string }>>('/users/invite', data),
};

// Clinical Notes API
export const clinicalNotesApi = {
  getByPatient: (patientId: string, limit?: number) =>
    apiClient.get<ApiResponse<ClinicalNote[]>>(`/clinical-notes/patient/${patientId}`, { params: limit ? { limit } : undefined }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<ClinicalNote>>(`/clinical-notes/${id}`),

  create: (data: { patientId: string; type: string; title: string; content?: string; soapContent?: SoapContent }) =>
    apiClient.post<ApiResponse<ClinicalNote>>('/clinical-notes', data),

  update: (id: string, data: { title?: string; content?: string; soapContent?: SoapContent }) =>
    apiClient.put<ApiResponse<ClinicalNote>>(`/clinical-notes/${id}`, data),

  sign: (id: string) =>
    apiClient.post<ApiResponse<ClinicalNote>>(`/clinical-notes/${id}/sign`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/clinical-notes/${id}`),

  getTimeTracking: (patientId: string, startDate: string, endDate: string) =>
    apiClient.get<ApiResponse<TimeTracking>>(`/clinical-notes/patient/${patientId}/time-tracking`, { params: { startDate, endDate } }),

  createCommunicationLog: (data: { patientId: string; type: string; direction: string; summary?: string; durationMinutes?: number }) =>
    apiClient.post<ApiResponse<ClinicalNote>>('/clinical-notes/communication-log', data),

  getCommunicationLogs: (patientId: string, limit?: number) =>
    apiClient.get<ApiResponse<ClinicalNote[]>>(`/clinical-notes/patient/${patientId}/communication-logs`, { params: limit ? { limit } : undefined }),
};

// Consents API
export const consentsApi = {
  getTemplates: () =>
    apiClient.get<ApiResponse<ConsentTemplate[]>>('/consents/templates'),

  getByPatient: (patientId: string) =>
    apiClient.get<ApiResponse<Consent[]>>(`/consents/patient/${patientId}`),

  getPending: (patientId: string) =>
    apiClient.get<ApiResponse<Consent[]>>(`/consents/patient/${patientId}/pending`),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Consent>>(`/consents/${id}`),

  send: (data: { patientId: string; templateId: string; customFields?: Record<string, string> }) =>
    apiClient.post<ApiResponse<Consent>>('/consents/send', data),

  sign: (id: string, data: { signatureData: string; customFields?: Record<string, string> }) =>
    apiClient.post<ApiResponse<Consent>>(`/consents/${id}/sign`, data),

  revoke: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Consent>>(`/consents/${id}/revoke`, { reason }),

  getStatus: (patientId: string, type: string) =>
    apiClient.get<ApiResponse<{ hasConsent: boolean; consent?: Consent }>>(`/consents/patient/${patientId}/status/${type}`),

  sendReminder: (consentId: string) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/consents/${consentId}/remind`),

  seedTemplates: () =>
    apiClient.post<ApiResponse<ConsentTemplate[]>>('/consents/seed-templates'),
};

export { apiClient, ApiError };
