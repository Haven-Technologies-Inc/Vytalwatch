/**
 * ReshADX TypeScript SDK - Risk Resource
 */

import { HttpClient } from '../utils/http';
import {
  AssessRiskRequest,
  RiskAssessment,
  SimSwapCheckRequest,
  SimSwapCheckResponse,
  DeviceFingerprint,
} from '../types';

export class Risk {
  constructor(private http: HttpClient) {}

  /**
   * Assess risk for a transaction
   */
  async assess(request: AssessRiskRequest): Promise<{ assessment: RiskAssessment }> {
    return this.http.post('/risk/assess', request);
  }

  /**
   * Check for SIM swap fraud
   */
  async checkSimSwap(request: SimSwapCheckRequest): Promise<SimSwapCheckResponse> {
    return this.http.post<SimSwapCheckResponse>('/risk/sim-swap/check', request);
  }

  /**
   * Get fraud alerts for current user
   */
  async getAlerts(params: {
    status?: 'PENDING' | 'REVIEWED' | 'RESOLVED';
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    page?: number;
    limit?: number;
  } = {}): Promise<{
    alerts: Array<{
      alertId: string;
      type: string;
      riskLevel: string;
      description: string;
      status: string;
      createdAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    return this.http.get('/risk/alerts', { params });
  }

  /**
   * Report a transaction as fraud
   */
  async reportFraud(transactionId: string, reason: string, details?: string): Promise<{
    reportId: string;
    status: string;
  }> {
    return this.http.post('/risk/fraud/report', {
      transactionId,
      reason,
      details,
    });
  }

  /**
   * Get device trust score
   */
  async getDeviceTrustScore(deviceFingerprint: DeviceFingerprint): Promise<{
    trustScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
  }> {
    return this.http.post('/risk/device/trust-score', { deviceFingerprint });
  }

  /**
   * Get velocity checks (transaction frequency analysis)
   */
  async getVelocityChecks(): Promise<{
    dailyTransactionCount: number;
    dailyTransactionAmount: number;
    weeklyTransactionCount: number;
    weeklyTransactionAmount: number;
    unusualActivity: boolean;
    flags: string[];
  }> {
    return this.http.get('/risk/velocity-checks');
  }

  /**
   * Whitelist a device
   */
  async whitelistDevice(deviceId: string, deviceName?: string): Promise<{
    success: boolean;
    deviceId: string;
  }> {
    return this.http.post('/risk/device/whitelist', { deviceId, deviceName });
  }

  /**
   * Remove device from whitelist
   */
  async removeDeviceWhitelist(deviceId: string): Promise<{ success: boolean }> {
    return this.http.delete(`/risk/device/whitelist/${deviceId}`);
  }
}
