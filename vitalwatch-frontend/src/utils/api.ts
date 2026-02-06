/**
 * API Client for VytalWatch
 *
 * Centralized API client with authentication, error handling, and type safety.
 * @module utils/api
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  requiresAuth?: boolean;
}

/**
 * Make an authenticated API request
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, requiresAuth = true, ...fetchOptions } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    );
    url += `?${searchParams}`;
  }

  // Setup headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add authentication token if required
  if (requiresAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      const error = isJson ? await response.json() : { message: response.statusText };
      throw new ApiClientError(
        error.message || 'An error occurred',
        response.status,
        error.errors
      );
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return isJson ? await response.json() : ({} as T);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * API client methods
 */
export const api = {
  // Generic HTTP methods
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // Authentication
  auth: {
    login: (email: string, password: string) =>
      api.post<{ token: string; user: any }>('/auth/login', { email, password }),

    logout: () => api.post('/auth/logout'),

    register: (data: { email: string; password: string; role: string }) =>
      api.post('/auth/register', data),

    me: () => api.get<any>('/auth/me'),

    refreshToken: () => api.post<{ token: string }>('/auth/refresh'),
  },

  // Patients
  patients: {
    list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
      api.get<{ patients: any[]; total: number; page: number }>('/patients', { params }),

    get: (id: string) => api.get<any>(`/patients/${id}`),

    create: (data: any) => api.post<any>('/patients', data),

    update: (id: string, data: any) => api.patch<any>(`/patients/${id}`, data),

    delete: (id: string) => api.delete(`/patients/${id}`),

    vitals: (id: string, params?: { start?: string; end?: string }) =>
      api.get<any[]>(`/patients/${id}/vitals`, { params }),

    medications: (id: string) => api.get<any[]>(`/patients/${id}/medications`),

    appointments: (id: string) => api.get<any[]>(`/patients/${id}/appointments`),
  },

  // Vitals
  vitals: {
    create: (patientId: string, data: any) =>
      api.post<any>(`/patients/${patientId}/vitals`, data),

    list: (patientId: string) => api.get<any[]>(`/patients/${patientId}/vitals`),

    latest: (patientId: string) => api.get<any>(`/patients/${patientId}/vitals/latest`),
  },

  // Medications
  medications: {
    create: (data: any) => api.post<any>('/medications', data),

    update: (id: string, data: any) => api.patch<any>(`/medications/${id}`, data),

    delete: (id: string) => api.delete(`/medications/${id}`),

    adherence: (medicationId: string) =>
      api.get<any>(`/medications/${medicationId}/adherence`),
  },

  // Appointments
  appointments: {
    list: (params?: { providerId?: string; patientId?: string; date?: string }) =>
      api.get<any[]>('/appointments', { params }),

    create: (data: any) => api.post<any>('/appointments', data),

    update: (id: string, data: any) => api.patch<any>(`/appointments/${id}`, data),

    cancel: (id: string) => api.delete(`/appointments/${id}`),
  },

  // Alerts
  alerts: {
    list: (params?: { patientId?: string; severity?: string; status?: string }) =>
      api.get<any[]>('/alerts', { params }),

    get: (id: string) => api.get<any>(`/alerts/${id}`),

    acknowledge: (id: string) => api.post(`/alerts/${id}/acknowledge`),

    resolve: (id: string) => api.post(`/alerts/${id}/resolve`),
  },

  // Messages
  messages: {
    list: (conversationId: string) =>
      api.get<any[]>(`/conversations/${conversationId}/messages`),

    send: (conversationId: string, content: string) =>
      api.post(`/conversations/${conversationId}/messages`, { content }),

    conversations: () => api.get<any[]>('/conversations'),
  },

  // Devices
  devices: {
    list: (patientId?: string) =>
      api.get<any[]>('/devices', { params: patientId ? { patientId } : undefined }),

    register: (data: any) => api.post<any>('/devices', data),

    update: (id: string, data: any) => api.patch<any>(`/devices/${id}`, data),

    delete: (id: string) => api.delete(`/devices/${id}`),
  },

  // Clinical Notes
  notes: {
    list: (patientId: string) => api.get<any[]>(`/patients/${patientId}/notes`),

    create: (patientId: string, data: any) =>
      api.post<any>(`/patients/${patientId}/notes`, data),

    update: (id: string, data: any) => api.patch<any>(`/notes/${id}`, data),
  },

  // Analytics
  analytics: {
    patientStats: (patientId: string) =>
      api.get<any>(`/analytics/patients/${patientId}`),

    providerStats: (providerId: string) =>
      api.get<any>(`/analytics/providers/${providerId}`),

    organizationStats: () => api.get<any>('/analytics/organization'),
  },

  // Users (Admin)
  users: {
    list: (params?: { role?: string; status?: string; page?: number }) =>
      api.get<{ users: any[]; total: number }>('/users', { params }),

    create: (data: any) => api.post<any>('/users', data),

    update: (id: string, data: any) => api.patch<any>(`/users/${id}`, data),

    delete: (id: string) => api.delete(`/users/${id}`),
  },
};

export default api;
