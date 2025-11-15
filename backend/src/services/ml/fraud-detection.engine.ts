/**
 * ReshADX - Fraud Detection ML Engine
 * Advanced fraud detection with SIM swap detection for African markets
 */

import db from '../../database';
import { logger } from '../../utils/logger';
import { CacheService } from '../../cache';

const cache = new CacheService();

export interface FraudCheckInput {
  userId: string;
  transactionId?: string;
  accountId?: string;
  amount?: number;
  recipientId?: string;
  deviceFingerprint?: DeviceFingerprint;
  location?: LocationData;
}

export interface DeviceFingerprint {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface FraudCheckResult {
  userId: string;
  riskScore: number; // 0-100 (100 = highest risk)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fraudProbability: number; // 0-1
  decision: 'APPROVE' | 'REVIEW' | 'DECLINE' | 'BLOCK';
  flags: FraudFlag[];
  simSwapDetected: boolean;
  simSwapRisk: number; // 0-100
  recommendations: string[];
  calculatedAt: Date;
}

export interface FraudFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  score: number;
}

export class FraudDetectionEngine {
  /**
   * Perform comprehensive fraud check
   */
  async checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
    try {
      logger.info('Performing fraud check', { userId: input.userId });

      const flags: FraudFlag[] = [];
      let riskScore = 0;

      // Check 1: SIM Swap Detection (Critical for African markets)
      const simSwapCheck = await this.detectSimSwap(input.userId, input.deviceFingerprint);
      if (simSwapCheck.detected) {
        flags.push({
          type: 'SIM_SWAP',
          severity: 'CRITICAL',
          description: simSwapCheck.reason,
          score: simSwapCheck.riskScore,
        });
        riskScore += simSwapCheck.riskScore;
      }

      // Check 2: Unusual Transaction Patterns
      if (input.transactionId || input.amount) {
        const transactionCheck = await this.analyzeTransactionPattern(
          input.userId,
          input.amount,
          input.accountId
        );
        if (transactionCheck.isAnomalous) {
          flags.push({
            type: 'UNUSUAL_TRANSACTION',
            severity: transactionCheck.severity,
            description: transactionCheck.reason,
            score: transactionCheck.score,
          });
          riskScore += transactionCheck.score;
        }
      }

      // Check 3: Device Fingerprint Analysis
      if (input.deviceFingerprint) {
        const deviceCheck = await this.analyzeDeviceFingerprint(
          input.userId,
          input.deviceFingerprint
        );
        if (deviceCheck.isSuspicious) {
          flags.push({
            type: 'SUSPICIOUS_DEVICE',
            severity: deviceCheck.severity,
            description: deviceCheck.reason,
            score: deviceCheck.score,
          });
          riskScore += deviceCheck.score;
        }
      }

      // Check 4: Location Analysis (Impossible Travel)
      if (input.location) {
        const locationCheck = await this.analyzeLocation(input.userId, input.location);
        if (locationCheck.isImpossible) {
          flags.push({
            type: 'IMPOSSIBLE_TRAVEL',
            severity: 'HIGH',
            description: locationCheck.reason,
            score: locationCheck.score,
          });
          riskScore += locationCheck.score;
        }
      }

      // Check 5: Velocity Checks (too many transactions)
      const velocityCheck = await this.checkVelocity(input.userId);
      if (velocityCheck.exceeded) {
        flags.push({
          type: 'VELOCITY_EXCEEDED',
          severity: velocityCheck.severity,
          description: velocityCheck.reason,
          score: velocityCheck.score,
        });
        riskScore += velocityCheck.score;
      }

      // Check 6: Account Takeover Indicators
      const accountTakeoverCheck = await this.detectAccountTakeover(input.userId);
      if (accountTakeoverCheck.detected) {
        flags.push({
          type: 'ACCOUNT_TAKEOVER',
          severity: 'CRITICAL',
          description: accountTakeoverCheck.reason,
          score: accountTakeoverCheck.score,
        });
        riskScore += accountTakeoverCheck.score;
      }

      // Check 7: Known Fraud Patterns
      const patternCheck = await this.checkKnownFraudPatterns(input);
      if (patternCheck.matched) {
        flags.push({
          type: 'KNOWN_FRAUD_PATTERN',
          severity: 'CRITICAL',
          description: patternCheck.pattern,
          score: patternCheck.score,
        });
        riskScore += patternCheck.score;
      }

      // Check 8: Blacklist/Whitelist
      const listCheck = await this.checkLists(input.userId, input.deviceFingerprint?.ipAddress);
      if (listCheck.isBlacklisted) {
        flags.push({
          type: 'BLACKLISTED',
          severity: 'CRITICAL',
          description: listCheck.reason,
          score: 100,
        });
        riskScore = 100;
      } else if (listCheck.isWhitelisted) {
        riskScore = Math.max(0, riskScore - 30);
      }

      // Normalize risk score (0-100)
      riskScore = Math.min(100, riskScore);

      // Determine risk level
      const riskLevel = this.getRiskLevel(riskScore);

      // Make decision
      const decision = this.makeDecision(riskScore, flags);

      // Generate recommendations
      const recommendations = this.generateRecommendations(flags, riskScore);

      const result: FraudCheckResult = {
        userId: input.userId,
        riskScore,
        riskLevel,
        fraudProbability: riskScore / 100,
        decision,
        flags,
        simSwapDetected: simSwapCheck.detected,
        simSwapRisk: simSwapCheck.riskScore,
        recommendations,
        calculatedAt: new Date(),
      };

      // Log fraud check
      await this.logFraudCheck(result, input);

      // Trigger alerts if high risk
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.triggerAlert(result, input);
      }

      logger.info('Fraud check completed', {
        userId: input.userId,
        riskScore,
        riskLevel,
        decision,
      });

      return result;
    } catch (error) {
      logger.error('Error performing fraud check', { error, userId: input.userId });
      throw error;
    }
  }

  /**
   * Detect SIM swap (critical for African mobile money fraud)
   */
  private async detectSimSwap(
    userId: string,
    deviceFingerprint?: DeviceFingerprint
  ): Promise<{
    detected: boolean;
    reason: string;
    riskScore: number;
  }> {
    // Get user's phone number
    const user = await db('users').where({ user_id: userId }).first();
    if (!user || !user.phone_number) {
      return { detected: false, reason: '', riskScore: 0 };
    }

    // Check 1: Device ID change
    const lastKnownDevice = await cache.get<string>(`device:${userId}`);
    if (deviceFingerprint && lastKnownDevice && deviceFingerprint.deviceId !== lastKnownDevice) {
      // Device changed - check how recently
      const lastLogin = await db('sessions')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .first();

      if (lastLogin) {
        const hoursSinceLastLogin = (Date.now() - new Date(lastLogin.created_at).getTime()) / (1000 * 60 * 60);

        // If device changed within 24 hours of last login, high risk
        if (hoursSinceLastLogin < 24) {
          return {
            detected: true,
            reason: `Device changed within ${Math.round(hoursSinceLastLogin)} hours of last login`,
            riskScore: 80,
          };
        } else if (hoursSinceLastLogin < 72) {
          return {
            detected: true,
            reason: 'Recent device change detected',
            riskScore: 50,
          };
        }
      }
    }

    // Check 2: Multiple failed OTP attempts
    const otpAttempts = await cache.get<number>(`otp_failures:${userId}`);
    if (otpAttempts && otpAttempts >= 3) {
      return {
        detected: true,
        reason: `${otpAttempts} failed OTP attempts detected`,
        riskScore: 60,
      };
    }

    // Check 3: Phone verification status change
    if (user.phone_verified === false && user.phone_verified_previously === true) {
      return {
        detected: true,
        reason: 'Phone verification status changed',
        riskScore: 70,
      };
    }

    // Check 4: Integration with telecom provider SIM swap API
    // In production, this would call MTN/Vodafone/AirtelTigo APIs
    const telecomCheck = await this.checkTelecomSimSwap(user.phone_number);
    if (telecomCheck.swapped) {
      const daysSinceSwap = telecomCheck.daysSinceSwap;

      if (daysSinceSwap <= 1) {
        return {
          detected: true,
          reason: `SIM swapped ${daysSinceSwap} day(s) ago (confirmed by telecom)`,
          riskScore: 90,
        };
      } else if (daysSinceSwap <= 7) {
        return {
          detected: true,
          reason: `Recent SIM swap detected (${daysSinceSwap} days ago)`,
          riskScore: 60,
        };
      } else if (daysSinceSwap <= 30) {
        return {
          detected: false,
          reason: `SIM swap within 30 days (${daysSinceSwap} days ago)`,
          riskScore: 20,
        };
      }
    }

    return { detected: false, reason: '', riskScore: 0 };
  }

  /**
   * Check with telecom provider for SIM swap
   */
  private async checkTelecomSimSwap(phoneNumber: string): Promise<{
    swapped: boolean;
    daysSinceSwap: number;
  }> {
    // In production, integrate with:
    // - MTN Ghana SIM swap API
    // - Vodafone Ghana API
    // - AirtelTigo API
    // For now, return no swap detected
    return { swapped: false, daysSinceSwap: 0 };
  }

  /**
   * Analyze transaction patterns for anomalies
   */
  private async analyzeTransactionPattern(
    userId: string,
    amount?: number,
    accountId?: string
  ): Promise<{
    isAnomalous: boolean;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
  }> {
    if (!amount) {
      return { isAnomalous: false, reason: '', severity: 'LOW', score: 0 };
    }

    // Get user's transaction history
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentTxns = await db('transactions')
      .where({ user_id: userId })
      .where('date', '>=', last30Days)
      .orderBy('date', 'desc');

    if (recentTxns.length === 0) {
      // First transaction - moderate risk
      return {
        isAnomalous: true,
        reason: 'First transaction for this account',
        severity: 'MEDIUM',
        score: 30,
      };
    }

    // Calculate statistics
    const amounts = recentTxns.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const stdDev = Math.sqrt(
      amounts.map(x => Math.pow(x - avgAmount, 2)).reduce((a, b) => a + b, 0) / amounts.length
    );

    // Check for anomalies
    const zScore = stdDev > 0 ? (amount - avgAmount) / stdDev : 0;

    // Amount significantly higher than average
    if (zScore > 3) {
      return {
        isAnomalous: true,
        reason: `Amount is ${Math.round(zScore)} standard deviations above average`,
        severity: 'HIGH',
        score: 50,
      };
    }

    // Amount much higher than previous max
    if (amount > maxAmount * 2) {
      return {
        isAnomalous: true,
        reason: `Amount is ${Math.round((amount / maxAmount) * 100)}% of previous maximum`,
        severity: 'HIGH',
        score: 45,
      };
    }

    // Large round number (common in fraud)
    if (amount >= 100000 && amount % 100000 === 0) {
      return {
        isAnomalous: true,
        reason: 'Large round number transaction',
        severity: 'MEDIUM',
        score: 25,
      };
    }

    return { isAnomalous: false, reason: '', severity: 'LOW', score: 0 };
  }

  /**
   * Analyze device fingerprint
   */
  private async analyzeDeviceFingerprint(
    userId: string,
    fingerprint: DeviceFingerprint
  ): Promise<{
    isSuspicious: boolean;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
  }> {
    // Check 1: New device
    const knownDevices = await db('user_devices')
      .where({ user_id: userId, device_id: fingerprint.deviceId })
      .first();

    if (!knownDevices) {
      return {
        isSuspicious: true,
        reason: 'New device detected',
        severity: 'MEDIUM',
        score: 30,
      };
    }

    // Check 2: IP address blacklisted
    const ipBlacklisted = await this.isIpBlacklisted(fingerprint.ipAddress);
    if (ipBlacklisted) {
      return {
        isSuspicious: true,
        reason: 'IP address is blacklisted',
        severity: 'CRITICAL',
        score: 80,
      };
    }

    // Check 3: VPN/Proxy detection
    const isVpn = await this.detectVpn(fingerprint.ipAddress);
    if (isVpn) {
      return {
        isSuspicious: true,
        reason: 'VPN or proxy detected',
        severity: 'MEDIUM',
        score: 35,
      };
    }

    return { isSuspicious: false, reason: '', severity: 'LOW', score: 0 };
  }

  /**
   * Analyze location for impossible travel
   */
  private async analyzeLocation(
    userId: string,
    currentLocation: LocationData
  ): Promise<{
    isImpossible: boolean;
    reason: string;
    score: number;
  }> {
    // Get last known location
    const lastLocation = await cache.get<LocationData>(`location:${userId}`);

    if (!lastLocation) {
      // Store current location
      await cache.set(`location:${userId}`, currentLocation, 3600);
      return { isImpossible: false, reason: '', score: 0 };
    }

    // Calculate distance
    const distance = this.calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    // Calculate time difference
    const timeDiff = (currentLocation.timestamp.getTime() - lastLocation.timestamp.getTime()) / 1000; // seconds

    // Maximum possible speed (km/h) - accounting for flight
    const maxSpeed = 1000; // 1000 km/h (faster than commercial flight)
    const maxDistance = (maxSpeed * timeDiff) / 3600; // km

    if (distance > maxDistance) {
      return {
        isImpossible: true,
        reason: `Impossible travel: ${Math.round(distance)} km in ${Math.round(timeDiff / 60)} minutes`,
        score: 70,
      };
    }

    // Update location
    await cache.set(`location:${userId}`, currentLocation, 3600);

    return { isImpossible: false, reason: '', score: 0 };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check velocity (transaction frequency)
   */
  private async checkVelocity(userId: string): Promise<{
    exceeded: boolean;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
  }> {
    // Check transactions in last hour
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);

    const hourlyTxns = await db('transactions')
      .where({ user_id: userId })
      .where('created_at', '>=', lastHour)
      .count('* as count');

    const count = parseInt(hourlyTxns[0].count as string);

    if (count > 20) {
      return {
        exceeded: true,
        reason: `${count} transactions in the last hour`,
        severity: 'CRITICAL',
        score: 70,
      };
    } else if (count > 10) {
      return {
        exceeded: true,
        reason: `${count} transactions in the last hour`,
        severity: 'HIGH',
        score: 50,
      };
    } else if (count > 5) {
      return {
        exceeded: true,
        reason: `${count} transactions in the last hour`,
        severity: 'MEDIUM',
        score: 30,
      };
    }

    return { exceeded: false, reason: '', severity: 'LOW', score: 0 };
  }

  /**
   * Detect account takeover
   */
  private async detectAccountTakeover(userId: string): Promise<{
    detected: boolean;
    reason: string;
    score: number;
  }> {
    // Check for recent password changes
    const user = await db('users').where({ user_id: userId }).first();

    if (user && user.password_changed_at) {
      const hoursSinceChange = (Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 60 * 60);

      if (hoursSinceChange < 1) {
        return {
          detected: true,
          reason: 'Password changed less than 1 hour ago',
          score: 60,
        };
      }
    }

    // Check for recent email/phone changes
    if (user && user.email_changed_at) {
      const hoursSinceChange = (Date.now() - new Date(user.email_changed_at).getTime()) / (1000 * 60 * 60);

      if (hoursSinceChange < 24) {
        return {
          detected: true,
          reason: 'Email changed recently',
          score: 50,
        };
      }
    }

    return { detected: false, reason: '', score: 0 };
  }

  /**
   * Check known fraud patterns
   */
  private async checkKnownFraudPatterns(input: FraudCheckInput): Promise<{
    matched: boolean;
    pattern: string;
    score: number;
  }> {
    // In production, this would check against a database of known fraud patterns
    // Examples:
    // - Sequential account numbers
    // - Similar names/addresses
    // - Known fraud rings
    // - Synthetic identities

    return { matched: false, pattern: '', score: 0 };
  }

  /**
   * Check blacklist/whitelist
   */
  private async checkLists(
    userId: string,
    ipAddress?: string
  ): Promise<{
    isBlacklisted: boolean;
    isWhitelisted: boolean;
    reason: string;
  }> {
    // Check user blacklist
    const userBlacklist = await db('blacklist')
      .where({ user_id: userId, type: 'USER' })
      .first();

    if (userBlacklist) {
      return {
        isBlacklisted: true,
        isWhitelisted: false,
        reason: userBlacklist.reason || 'User is blacklisted',
      };
    }

    // Check IP blacklist
    if (ipAddress) {
      const ipBlacklist = await db('blacklist')
        .where({ value: ipAddress, type: 'IP' })
        .first();

      if (ipBlacklist) {
        return {
          isBlacklisted: true,
          isWhitelisted: false,
          reason: 'IP address is blacklisted',
        };
      }
    }

    // Check whitelist
    const whitelist = await db('whitelist')
      .where({ user_id: userId })
      .first();

    if (whitelist) {
      return {
        isBlacklisted: false,
        isWhitelisted: true,
        reason: 'User is whitelisted',
      };
    }

    return { isBlacklisted: false, isWhitelisted: false, reason: '' };
  }

  /**
   * Check if IP is blacklisted
   */
  private async isIpBlacklisted(ipAddress: string): Promise<boolean> {
    const blacklist = await db('blacklist')
      .where({ value: ipAddress, type: 'IP' })
      .first();

    return !!blacklist;
  }

  /**
   * Detect VPN/Proxy
   */
  private async detectVpn(ipAddress: string): Promise<boolean> {
    // In production, integrate with IP intelligence services
    // - IPHub
    // - IPQualityScore
    // - MaxMind
    return false;
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Make decision based on risk score
   */
  private makeDecision(
    riskScore: number,
    flags: FraudFlag[]
  ): 'APPROVE' | 'REVIEW' | 'DECLINE' | 'BLOCK' {
    // Critical flags = immediate block
    const hasCritical = flags.some(f => f.severity === 'CRITICAL');
    if (hasCritical) return 'BLOCK';

    // High risk = decline
    if (riskScore >= 70) return 'DECLINE';

    // Medium-high risk = manual review
    if (riskScore >= 40) return 'REVIEW';

    // Low risk = approve
    return 'APPROVE';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(flags: FraudFlag[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (flags.some(f => f.type === 'SIM_SWAP')) {
      recommendations.push('Verify user identity via alternative channel');
      recommendations.push('Contact user at previously verified email');
      recommendations.push('Require additional authentication');
    }

    if (flags.some(f => f.type === 'SUSPICIOUS_DEVICE')) {
      recommendations.push('Send device verification email/SMS');
      recommendations.push('Enable two-factor authentication');
    }

    if (flags.some(f => f.type === 'UNUSUAL_TRANSACTION')) {
      recommendations.push('Confirm transaction with user');
      recommendations.push('Implement transaction limits');
    }

    if (flags.some(f => f.type === 'VELOCITY_EXCEEDED')) {
      recommendations.push('Implement rate limiting');
      recommendations.push('Require cool-down period');
    }

    if (riskScore >= 50 && recommendations.length === 0) {
      recommendations.push('Manual review recommended');
      recommendations.push('Verify user identity');
    }

    return recommendations;
  }

  /**
   * Log fraud check
   */
  private async logFraudCheck(result: FraudCheckResult, input: FraudCheckInput): Promise<void> {
    await db('fraud_checks').insert({
      user_id: result.userId,
      transaction_id: input.transactionId,
      account_id: input.accountId,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      fraud_probability: result.fraudProbability,
      decision: result.decision,
      flags: JSON.stringify(result.flags),
      sim_swap_detected: result.simSwapDetected,
      sim_swap_risk: result.simSwapRisk,
      device_fingerprint: input.deviceFingerprint ? JSON.stringify(input.deviceFingerprint) : null,
      location: input.location ? JSON.stringify(input.location) : null,
      checked_at: result.calculatedAt,
    });
  }

  /**
   * Trigger alert for high-risk events
   */
  private async triggerAlert(result: FraudCheckResult, input: FraudCheckInput): Promise<void> {
    // In production, this would:
    // 1. Send alert to fraud monitoring dashboard
    // 2. Notify fraud team via email/SMS/Slack
    // 3. Trigger webhook to client application
    // 4. Update user risk profile

    logger.warn('High-risk fraud event detected', {
      userId: result.userId,
      riskScore: result.riskScore,
      decision: result.decision,
      flags: result.flags.map(f => f.type),
    });

    // Store alert
    await db('fraud_alerts').insert({
      user_id: result.userId,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      decision: result.decision,
      flags: JSON.stringify(result.flags),
      status: 'PENDING',
      created_at: new Date(),
    });
  }
}
