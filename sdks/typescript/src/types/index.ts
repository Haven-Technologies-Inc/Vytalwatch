/**
 * ReshADX TypeScript SDK - Core Types
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ReshADXConfig {
  apiKey: string;
  environment?: 'sandbox' | 'production';
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  requestId?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  requestId?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  referralCode?: string;
}

export interface RegisterResponse {
  userId: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: {
    deviceId: string;
    ipAddress: string;
    userAgent: string;
  };
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  accountTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  accountStatus: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'CLOSED';
  createdAt: string;
  lastLoginAt?: string;
}

// ============================================================================
// Link Types
// ============================================================================

export interface CreateLinkTokenRequest {
  userId: string;
  products: ('ACCOUNTS' | 'TRANSACTIONS' | 'IDENTITY' | 'BALANCE')[];
  institutionId?: string;
  redirectUri: string;
  language?: string;
  countryCode?: string;
  webhook?: string;
}

export interface CreateLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface ExchangePublicTokenRequest {
  publicToken: string;
}

export interface ExchangePublicTokenResponse {
  accessToken: string;
  itemId: string;
}

// ============================================================================
// Account Types
// ============================================================================

export interface Account {
  accountId: string;
  itemId: string;
  institutionId: string;
  accountNumber: string;
  accountName: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'MOBILE_MONEY' | 'WALLET';
  currency: string;
  balance: number;
  availableBalance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  openedDate?: string;
  updatedAt: string;
}

export interface GetAccountsResponse {
  accounts: Account[];
  item: {
    itemId: string;
    institutionId: string;
    institutionName: string;
    lastSyncedAt: string;
  };
}

export interface BalanceResponse {
  accountId: string;
  balance: number;
  availableBalance: number;
  currency: string;
  lastUpdated: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  subcategory?: string;
  description: string;
  merchantName?: string;
  merchantCategory?: string;
  date: string;
  postingDate?: string;
  pending: boolean;
  reference?: string;
  balance?: number;
  location?: {
    city?: string;
    country?: string;
  };
}

export interface GetTransactionsRequest {
  itemId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface SyncTransactionsRequest {
  itemId: string;
  startDate?: string;
  endDate?: string;
}

export interface SyncTransactionsResponse {
  added: number;
  modified: number;
  removed: number;
  syncedAt: string;
}

export interface SpendingAnalyticsRequest {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month' | 'category' | 'merchant';
  accountIds?: string[];
}

export interface SpendingAnalyticsResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  groupBy: string;
  data: Array<{
    key: string;
    totalSpending: number;
    totalIncome: number;
    netCashFlow: number;
    transactionCount: number;
    averageTransaction: number;
  }>;
  summary: {
    totalSpending: number;
    totalIncome: number;
    netCashFlow: number;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
}

// ============================================================================
// Credit Score Types
// ============================================================================

export interface CreditScore {
  score: number;
  scoreBand: 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT';
  defaultProbability: number;
  calculatedAt: string;
  validUntil: string;
}

export interface CalculateCreditScoreRequest {
  includeAlternativeData?: boolean;
}

export interface CalculateCreditScoreResponse {
  score: CreditScore;
  factors: CreditScoreFactor[];
}

export interface CreditScoreFactor {
  factor: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  weight: number;
  description: string;
}

export interface CreditRecommendation {
  type: 'BEHAVIOR' | 'PRODUCT' | 'ALERT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  potentialImpact: number;
  actionable: boolean;
}

// ============================================================================
// Risk Types
// ============================================================================

export interface DeviceFingerprint {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface AssessRiskRequest {
  amount: number;
  accountId: string;
  deviceFingerprint: DeviceFingerprint;
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'APPROVE' | 'REVIEW' | 'DECLINE' | 'BLOCK';
  flags: string[];
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
  }>;
  recommendations: string[];
}

export interface SimSwapCheckRequest {
  deviceFingerprint: DeviceFingerprint;
}

export interface SimSwapCheckResponse {
  simSwapDetected: boolean;
  simSwapRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  lastSimSwapDate?: string;
  deviceChanges: number;
  recommendations: string[];
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent =
  | 'TRANSACTIONS_UPDATED'
  | 'ITEM_SYNCED'
  | 'ITEM_ERROR'
  | 'ACCOUNT_UPDATED'
  | 'FRAUD_ALERT'
  | 'CREDIT_SCORE_UPDATED';

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  description?: string;
}

export interface Webhook {
  webhookId: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED';
  description?: string;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface WebhookDelivery {
  deliveryId: string;
  webhookId: string;
  event: WebhookEvent;
  payload: any;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  sentAt?: string;
  responseCode?: number;
  error?: string;
}

// ============================================================================
// Item Types
// ============================================================================

export interface Item {
  itemId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  lastSyncedAt?: string;
  consentExpiresAt?: string;
  availableProducts: string[];
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Institution Types
// ============================================================================

export interface Institution {
  institutionId: string;
  name: string;
  logo: string;
  primaryColor: string;
  type: 'BANK' | 'MOBILE_MONEY' | 'FINTECH';
  country: string;
  products: string[];
  status: 'ACTIVE' | 'DEGRADED' | 'DOWN';
  oauth: boolean;
}
