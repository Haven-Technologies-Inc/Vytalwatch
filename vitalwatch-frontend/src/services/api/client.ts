/**
 * VitalWatch API Client
 * Type-safe HTTP client for backend communication
 */

import { config } from '@/config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('vytalwatch-auth');
    if (!stored) return null;
    try {
      const { state } = JSON.parse(stored);
      return state?.accessToken || null;
    } catch {
      return null;
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error?.message || `Request failed with status ${response.status}`,
          data.error?.code || 'UNKNOWN_ERROR',
          response.status
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 'TIMEOUT', 408);
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR',
        0
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
export default apiClient;
