/**
 * VitalWatch API Client
 * Type-safe HTTP client for backend communication
 * Includes automatic token refresh on 401 responses
 */

import { config } from '@/config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
  /** Skip the token refresh interceptor (used internally to prevent loops) */
  _skipRefresh?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

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

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('vytalwatch-auth');
    if (!stored) return null;
    try {
      const { state } = JSON.parse(stored);
      return state?.refreshToken || null;
    } catch {
      return null;
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('vytalwatch-auth');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      parsed.state = {
        ...parsed.state,
        accessToken,
        refreshToken,
      };
      localStorage.setItem('vytalwatch-auth', JSON.stringify(parsed));
    } catch {
      // Ignore storage errors
    }
  }

  private clearAuth(): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('vytalwatch-auth');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      parsed.state = {
        ...parsed.state,
        user: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      };
      localStorage.setItem('vytalwatch-auth', JSON.stringify(parsed));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Uses a shared promise so concurrent 401s only trigger one refresh.
   * Returns true if the refresh succeeded, false otherwise.
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    // If already refreshing, wait for the in-flight refresh to resolve
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        const newAccessToken = data.data?.accessToken || data.accessToken;
        const newRefreshToken = data.data?.refreshToken || data.refreshToken || refreshToken;

        if (newAccessToken) {
          this.setTokens(newAccessToken, newRefreshToken);

          // Also update the Zustand store in memory if it exists
          try {
            const { useAuthStore } = await import('@/stores/authStore');
            useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
          } catch {
            // Store may not be available in all contexts
          }

          return true;
        }

        return false;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Redirect to login and clear auth state
   */
  private redirectToLogin(): void {
    this.clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
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

      // Handle 401 with token refresh interceptor
      if (response.status === 401 && !options._skipRefresh) {
        const refreshSucceeded = await this.attemptTokenRefresh();

        if (refreshSucceeded) {
          // Retry the original request with the new token
          return this.request<T>(method, endpoint, body, {
            ...options,
            _skipRefresh: true, // Prevent infinite refresh loops
          });
        }

        // Refresh failed -- redirect to login
        this.redirectToLogin();
        throw new ApiError(
          'Session expired. Please log in again.',
          'SESSION_EXPIRED',
          401
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error?.message || data.message || `Request failed with status ${response.status}`,
          data.error?.code || 'UNKNOWN_ERROR',
          response.status
        );
      }

      return { data, status: response.status } as unknown as T;
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
