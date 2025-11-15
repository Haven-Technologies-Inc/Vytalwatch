/**
 * ReshADX TypeScript SDK - Auth Resource
 */

import { HttpClient } from '../utils/http';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  User,
} from '../types';

export class Auth {
  constructor(private http: HttpClient) {}

  /**
   * Register a new user
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.http.post<RegisterResponse>('/auth/register', request);

    // Automatically set access token for subsequent requests
    this.http.setAccessToken(response.tokens.accessToken);

    return response;
  }

  /**
   * Login with email and password
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/auth/login', request);

    // Automatically set access token for subsequent requests
    this.http.setAccessToken(response.tokens.accessToken);

    return response;
  }

  /**
   * Logout (clear local token)
   */
  logout(): void {
    this.http.clearAccessToken();
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return this.http.get<User>('/auth/me');
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/auth/verify-email', { token });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/auth/forgot-password', { email });
  }

  /**
   * Reset password with reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/auth/reset-password', {
      token,
      newPassword,
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await this.http.post<{ accessToken: string }>('/auth/refresh-token', {
      refreshToken,
    });

    // Update access token
    this.http.setAccessToken(response.accessToken);

    return response;
  }

  /**
   * Change password (requires current password)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Promise<User> {
    return this.http.patch<User>('/auth/profile', updates);
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    return this.http.post<{
      secret: string;
      qrCode: string;
      backupCodes: string[];
    }>('/auth/2fa/enable');
  }

  /**
   * Verify two-factor authentication setup
   */
  async verifyTwoFactor(code: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/auth/2fa/verify', { code });
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/auth/2fa/disable', { password });
  }
}
