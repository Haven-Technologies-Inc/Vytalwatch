/**
 * ReshADX - API Client
 * Production-ready API client for connecting to the backend
 */

// Types
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber?: string;
  country: string;
  role: string;
  accountTier: string;
  accountStatus: string;
  kycStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  request_id?: string;
}

export interface Institution {
  institutionId: string;
  name: string;
  displayName: string;
  institutionType: string;
  country: string;
  logoUrl?: string;
  primaryColor?: string;
  supportsOAuth: boolean;
  supportsApi: boolean;
  supportsUssd: boolean;
  isMobileMoney: boolean;
}

export interface Account {
  accountId: string;
  institutionId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
  status: string;
}

export interface Transaction {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  pending: boolean;
  type: string;
}

export interface CreditScore {
  score: number;
  scoreType: string;
  factors: Array<{
    name: string;
    impact: string;
    description: string;
  }>;
  recommendations: string[];
  calculatedAt: string;
}

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT = 30000;

// Token management
const getAccessToken = () => localStorage.getItem('reshadx_access_token');
const getRefreshToken = () => localStorage.getItem('reshadx_refresh_token');

// Request helper
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Request failed with status ${response.status}`);
      }

      return data.data || data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(`${endpoint}${queryString}`, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const client = new ApiClient(API_BASE_URL);

// API modules
export const api = {
  // Authentication
  auth: {
    register: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      phoneNumber?: string;
      country?: string;
      dateOfBirth?: string;
      referralCode?: string;
    }): Promise<AuthResponse> => client.post('/auth/register', data),

    login: (data: { email: string; password: string }): Promise<AuthResponse> =>
      client.post('/auth/login', data),

    loginWithPhone: (data: { phoneNumber: string; password: string }): Promise<AuthResponse> =>
      client.post('/auth/login/phone', data),

    verifyEmail: (token: string): Promise<void> =>
      client.post('/auth/verify/email', { token }),

    verifyPhone: (phoneNumber: string, otp: string): Promise<void> =>
      client.post('/auth/verify/phone', { phoneNumber, otp }),

    forgotPassword: (email: string): Promise<void> =>
      client.post('/auth/forgot-password', { email }),

    resetPassword: (token: string, newPassword: string): Promise<void> =>
      client.post('/auth/reset-password', { token, newPassword }),

    refreshToken: (refreshToken: string): Promise<TokenPair> =>
      client.post('/auth/refresh', { refreshToken }),

    logout: (): Promise<void> => client.post('/auth/logout'),

    getCurrentUser: (): Promise<User> => client.get('/auth/me'),
  },

  // Link (Account Linking)
  link: {
    createToken: (data: {
      products: string[];
      countryCode?: string;
      language?: string;
      webhook?: string;
      redirectUri?: string;
    }): Promise<{ linkToken: string; expiration: string }> =>
      client.post('/link/token/create', data),

    exchangeToken: (publicToken: string): Promise<{ accessToken: string; itemId: string }> =>
      client.post('/link/token/exchange', { publicToken }),

    getInstitutions: (params?: {
      country?: string;
      type?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }): Promise<{ institutions: Institution[]; total: number }> =>
      client.get('/link/institutions', params),

    getInstitution: (institutionId: string): Promise<Institution> =>
      client.get(`/link/institutions/${institutionId}`),

    initiateOAuth: (data: {
      institutionId: string;
      redirectUri: string;
    }): Promise<{ oauthUrl: string; state: string }> =>
      client.post('/link/oauth/initiate', data),

    initiateUSSD: (data: {
      phoneNumber: string;
      institutionId: string;
    }): Promise<{ sessionId: string; ussdCode: string; instructions: string }> =>
      client.post('/link/ussd/initiate', data),

    verifyUSSD: (sessionId: string, code: string): Promise<{ publicToken: string; itemId: string }> =>
      client.post('/link/ussd/verify', { sessionId, code }),
  },

  // Items (Institution Connections)
  items: {
    getAll: (): Promise<any[]> => client.get('/item'),

    getById: (itemId: string): Promise<any> => client.get(`/item/${itemId}`),

    delete: (itemId: string): Promise<void> => client.delete(`/item/${itemId}`),

    sync: (itemId: string): Promise<void> => client.post(`/item/${itemId}/sync`),

    getStatus: (itemId: string): Promise<any> => client.get(`/item/${itemId}/status`),

    renewConsent: (itemId: string): Promise<void> =>
      client.post(`/item/${itemId}/consent/renew`),
  },

  // Accounts
  accounts: {
    getAll: (params?: { itemId?: string; type?: string; status?: string }): Promise<Account[]> =>
      client.get('/accounts', params),

    getById: (accountId: string): Promise<Account> =>
      client.get(`/accounts/${accountId}`),

    getBalance: (accountId: string): Promise<{
      current: number;
      available?: number;
      currency: string;
    }> => client.get(`/accounts/${accountId}/balance`),

    getBalanceHistory: (accountId: string, params?: {
      startDate?: string;
      endDate?: string;
      interval?: string;
    }): Promise<any[]> => client.get(`/accounts/${accountId}/balance/history`, params),

    getIdentity: (accountId: string): Promise<any> =>
      client.get(`/accounts/${accountId}/identity`),

    verify: (accountId: string): Promise<any> =>
      client.post(`/accounts/${accountId}/verify`),
  },

  // Transactions
  transactions: {
    getAll: (params?: {
      accountId?: string;
      startDate?: string;
      endDate?: string;
      category?: string;
      minAmount?: number;
      maxAmount?: number;
      search?: string;
      limit?: number;
      offset?: number;
    }): Promise<{ transactions: Transaction[]; total: number }> =>
      client.get('/transactions', params),

    getById: (transactionId: string): Promise<Transaction> =>
      client.get(`/transactions/${transactionId}`),

    sync: (): Promise<{ added: number; modified: number; removed: number }> =>
      client.post('/transactions/sync'),

    getEnriched: (transactionId: string): Promise<any> =>
      client.get(`/transactions/${transactionId}/enrich`),

    getSpendingAnalytics: (params?: {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
    }): Promise<any> => client.get('/transactions/analytics/spending', params),

    getIncomeAnalytics: (params?: {
      startDate?: string;
      endDate?: string;
    }): Promise<any> => client.get('/transactions/analytics/income', params),

    getRecurring: (): Promise<any[]> => client.get('/transactions/recurring'),
  },

  // Credit Score
  creditScore: {
    get: (): Promise<CreditScore> => client.get('/credit-score'),

    calculate: (): Promise<CreditScore> => client.post('/credit-score/calculate'),

    getHistory: (): Promise<any[]> => client.get('/credit-score/history'),

    getFactors: (): Promise<any[]> => client.get('/credit-score/factors'),

    getRecommendations: (): Promise<string[]> =>
      client.get('/credit-score/recommendations'),

    submitAlternativeData: (data: {
      dataType: string;
      data: any;
    }): Promise<void> => client.post('/credit-score/alternative-data', data),

    getReport: (): Promise<any> => client.get('/credit-score/report'),
  },

  // Risk Assessment
  risk: {
    assess: (data: {
      type: string;
      data: any;
    }): Promise<any> => client.post('/risk/assess', data),

    getAssessments: (): Promise<any[]> => client.get('/risk/assessments'),

    getAssessment: (assessmentId: string): Promise<any> =>
      client.get(`/risk/assessments/${assessmentId}`),

    checkSimSwap: (phoneNumber: string): Promise<{ swapDetected: boolean; lastSwapDate?: string }> =>
      client.post('/risk/check/sim-swap', { phoneNumber }),

    checkSanctions: (data: { name: string; country?: string }): Promise<any> =>
      client.post('/risk/check/sanctions', data),

    checkPep: (data: { name: string; country?: string }): Promise<any> =>
      client.post('/risk/check/pep', data),

    getAccountRiskScore: (accountId: string): Promise<{ score: number; level: string }> =>
      client.get(`/risk/account/${accountId}/score`),

    getTransactionFlags: (transactionId: string): Promise<any[]> =>
      client.get(`/risk/transaction/${transactionId}/flags`),

    reportFraud: (data: {
      type: string;
      resourceId: string;
      description: string;
    }): Promise<void> => client.post('/risk/report-fraud', data),
  },

  // Webhooks
  webhooks: {
    create: (data: {
      url: string;
      eventTypes: string[];
      description?: string;
    }): Promise<any> => client.post('/webhooks', data),

    getAll: (): Promise<any[]> => client.get('/webhooks'),

    getById: (webhookId: string): Promise<any> => client.get(`/webhooks/${webhookId}`),

    update: (webhookId: string, data: {
      url?: string;
      eventTypes?: string[];
      status?: string;
    }): Promise<any> => client.patch(`/webhooks/${webhookId}`, data),

    delete: (webhookId: string): Promise<void> =>
      client.delete(`/webhooks/${webhookId}`),

    getDeliveries: (webhookId: string, params?: {
      limit?: number;
      offset?: number;
    }): Promise<any[]> => client.get(`/webhooks/${webhookId}/deliveries`, params),

    test: (webhookId: string): Promise<void> =>
      client.post(`/webhooks/${webhookId}/test`),

    rotateSecret: (webhookId: string): Promise<{ secret: string }> =>
      client.post(`/webhooks/${webhookId}/rotate-secret`),
  },

  // Analytics
  analytics: {
    getPlatformMetrics: (): Promise<any> => client.get('/analytics/platform'),

    getTransactionAnalytics: (params?: {
      startDate?: string;
      endDate?: string;
    }): Promise<any> => client.get('/analytics/transactions', params),

    getRevenueAnalytics: (params?: {
      startDate?: string;
      endDate?: string;
    }): Promise<any> => client.get('/analytics/revenue', params),

    getUserAnalytics: (): Promise<any> => client.get('/analytics/users'),

    getCreditScoreAnalytics: (): Promise<any> => client.get('/analytics/credit-scores'),

    getFraudAnalytics: (): Promise<any> => client.get('/analytics/fraud'),

    getApiPerformance: (): Promise<any> => client.get('/analytics/api-performance'),
  },

  // Admin
  admin: {
    getStats: (): Promise<any> => client.get('/admin/stats'),

    getUsers: (params?: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
    }): Promise<{ users: any[]; total: number }> => client.get('/admin/users', params),

    getUser: (userId: string): Promise<any> => client.get(`/admin/users/${userId}`),

    updateUserStatus: (userId: string, status: string): Promise<void> =>
      client.patch(`/admin/users/${userId}/status`, { status }),

    getRiskAlerts: (): Promise<any[]> => client.get('/admin/risk/alerts'),

    reviewRiskAssessment: (assessmentId: string, data: {
      status: string;
      notes?: string;
    }): Promise<void> => client.post(`/admin/risk/${assessmentId}/review`, data),

    getAuditLogs: (params?: {
      limit?: number;
      offset?: number;
      userId?: string;
      action?: string;
    }): Promise<any[]> => client.get('/admin/audit-logs', params),

    getInstitutions: (): Promise<any[]> => client.get('/admin/institutions'),

    updateInstitution: (institutionId: string, data: any): Promise<void> =>
      client.patch(`/admin/institutions/${institutionId}`, data),
  },

  // Health check
  health: {
    check: (): Promise<{ status: string; timestamp: string }> =>
      client.get('/health'),

    ready: (): Promise<{ status: string; services: any }> =>
      client.get('/health/ready'),
  },
};

export default api;
