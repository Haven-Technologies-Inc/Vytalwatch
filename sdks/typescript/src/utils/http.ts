/**
 * ReshADX TypeScript SDK - HTTP Client
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { ReshADXConfig, ApiError } from '../types';
import { ReshADXError } from './errors';

export class HttpClient {
  private client: AxiosInstance;
  private apiKey: string;
  private accessToken: string | null = null;

  constructor(config: ReshADXConfig) {
    this.apiKey = config.apiKey;

    const baseURL = config.baseUrl || this.getBaseUrl(config.environment || 'production');

    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': 'ReshADX-TypeScript-SDK/1.0.0',
      },
    });

    // Configure retry logic
    axiosRetry(this.client, {
      retries: config.maxRetries || 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors and 5xx server errors
        return (
          axiosRetry.isNetworkError(error) ||
          axiosRetry.isRetryableError(error) ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.data) {
          const apiError = error.response.data;
          throw new ReshADXError(
            apiError.error.message,
            apiError.error.code,
            error.response.status,
            apiError.error.details
          );
        }

        // Network or timeout error
        throw new ReshADXError(
          error.message || 'Network error occurred',
          'NETWORK_ERROR',
          0
        );
      }
    );
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    this.accessToken = null;
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<{ data: T }>(url, config);
    return response.data.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<{ data: T }>(url, data, config);
    return response.data.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<{ data: T }>(url, data, config);
    return response.data.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<{ data: T }>(url, data, config);
    return response.data.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<{ data: T }>(url, config);
    return response.data.data;
  }

  /**
   * Get base URL based on environment
   */
  private getBaseUrl(environment: 'sandbox' | 'production'): string {
    return environment === 'production'
      ? 'https://api.reshadx.com/v1'
      : 'https://sandbox-api.reshadx.com/v1';
  }
}
