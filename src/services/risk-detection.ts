// ReshADX Risk Detection & Fraud Prevention Service
// ML-powered fraud detection similar to Plaid Signal

import { RiskAssessment, FraudIndicators, AMLIndicators, DeviceRisk, BehavioralRisk, NetworkIntelligence, AfricanFraudIndicators } from '../types/risk-api';

// ============================================================================
// FRAUD DETECTION ENGINE
// ============================================================================

export class FraudDetectionEngine {
  private static instance: FraudDetectionEngine;

  private constructor() {}

  static getInstance(): FraudDetectionEngine {
    if (!FraudDetectionEngine.instance) {
      FraudDetectionEngine.instance = new FraudDetectionEngine();
    }
    return FraudDetectionEngine.instance;
  }

  /**
   * Main fraud detection function
   * Analyzes transaction and returns risk assessment
   */
  async assessRisk(params: {
    transaction: {
      amount: number;
      currency: string;
      merchant?: string;
      category?: string;
      payment_method: string;
    };
    user: {
      user_id: string;
      phone_number?: string;
      account_id?: string;
    };
    device: {
      device_id?: string;
      ip_address: string;
      user_agent?: string;
    };
    context: {
      timestamp: string;
      geolocation?: { latitude: number; longitude: number };
    };
  }): Promise<RiskAssessment> {
    // Parallel analysis of all risk factors
    const [
      fraudIndicators,
      amlIndicators,
      deviceRisk,
      behavioralRisk,
      networkIntelligence,
      africanFraudIndicators,
    ] = await Promise.all([
      this.analyzeFraudIndicators(params),
      this.analyzeAML(params),
      this.analyzeDeviceRisk(params.device),
      this.analyzeBehavioralRisk(params),
      this.analyzeNetworkIntelligence(params.user),
      this.analyzeAfricanFraudPatterns(params),
    ]);

    // Calculate overall risk score (0-100)
    const riskScore = this.calculateOverallRiskScore({
      fraudIndicators,
      amlIndicators,
      deviceRisk,
      behavioralRisk,
      networkIntelligence,
      africanFraudIndicators,
    });

    // Determine risk level
    const riskLevel =
      riskScore >= 80 ? 'CRITICAL' :
      riskScore >= 60 ? 'HIGH' :
      riskScore >= 40 ? 'MEDIUM' : 'LOW';

    // Recommended action
    const recommendedAction =
      riskScore >= 85 ? 'BLOCK' :
      riskScore >= 70 ? 'CHALLENGE' :
      riskScore >= 50 ? 'REVIEW' : 'APPROVE';

    // Generate risk factors with SHAP-like explanations
    const riskFactors = this.generateRiskFactors({
      fraudIndicators,
      amlIndicators,
      deviceRisk,
      behavioralRisk,
      networkIntelligence,
      africanFraudIndicators,
    });

    return {
      risk_id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      account_id: params.user.account_id || '',
      user_id: params.user.user_id,
      timestamp: params.context.timestamp,

      risk_score: riskScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,

      fraud_indicators: fraudIndicators,
      aml_indicators: amlIndicators,
      device_risk: deviceRisk,
      behavioral_risk: behavioralRisk,
      network_intelligence: networkIntelligence,

      recommended_action: recommendedAction,
      challenge_methods: recommendedAction === 'CHALLENGE' ? ['SMS_OTP', 'BIOMETRIC'] : undefined,

      model_version: 'v2.1.0',
      model_confidence: 0.92,

      request_id: `req_${Date.now()}`,
    };
  }

  /**
   * Analyze fraud indicators
   */
  private async analyzeFraudIndicators(params: any): Promise<FraudIndicators> {
    // Simulated fraud analysis (in production, this would use ML models)
    const amount = params.transaction.amount;
    const avgTransactionAmount = 500; // Would fetch from user history

    return {
      // Account Takeover
      account_takeover_score: 15,
      suspicious_login: false,
      device_change_detected: false,
      location_change_detected: false,

      // SIM Swap Detection (Critical for Africa)
      sim_swap_detected: await this.detectSIMSwap(params.user.phone_number),
      sim_swap_date: undefined,
      sim_swap_risk_score: 5,

      // Transaction Pattern Anomalies
      unusual_amount: amount > avgTransactionAmount * 3,
      unusual_merchant: false,
      unusual_time: this.isUnusualTime(params.context.timestamp),
      unusual_frequency: false,
      velocity_breach: false,

      // Network Fraud
      coordinated_fraud_ring: false,
      mule_account_probability: 0.05,
      synthetic_identity_score: 0.1,

      // Mobile Money Specific
      agent_fraud_risk: false,
      airtime_topup_pattern_suspicious: false,
      cross_network_anomaly: false,
    };
  }

  /**
   * Detect SIM swap fraud
   * This is CRITICAL in Africa where mobile money is prevalent
   */
  private async detectSIMSwap(phoneNumber?: string): Promise<boolean> {
    if (!phoneNumber) return false;

    // In production, this would:
    // 1. Check with telecom APIs (MTN, Vodafone, etc.)
    // 2. Compare device IMEI changes
    // 3. Analyze login pattern changes
    // 4. Check for recent number port requests

    // Simulated detection
    return Math.random() < 0.02; // 2% chance for demo
  }

  /**
   * Check if transaction time is unusual
   */
  private isUnusualTime(timestamp: string): boolean {
    const hour = new Date(timestamp).getHours();
    // Flag transactions between 2 AM - 5 AM as unusual
    return hour >= 2 && hour <= 5;
  }

  /**
   * AML (Anti-Money Laundering) Analysis
   */
  private async analyzeAML(params: any): Promise<AMLIndicators> {
    // In production, this would check against:
    // - OFAC sanctions lists
    // - UN sanctions lists
    // - EU sanctions lists
    // - Local watchlists (Ghana, Nigeria, Kenya, etc.)
    // - PEP databases

    const amount = params.transaction.amount;
    const currency = params.transaction.currency;

    return {
      // Sanctions Screening
      sanctions_match: false,
      sanctions_lists: [],
      pep_match: false,
      pep_details: undefined,

      // Suspicious Activity
      structuring_detected: false,
      layering_detected: false,
      placement_score: 0.1,

      // High-Risk Indicators
      high_risk_country: false,
      high_risk_merchant: false,
      cash_intensive_business: false,

      // Transaction Monitoring
      large_cash_transaction: amount > 10000,
      rapid_movement_of_funds: false,
      unusual_cross_border: false,

      // Regulatory
      aml_risk_level: 'LOW',
      requires_sar: false,
      requires_ctr: amount > 10000,
    };
  }

  /**
   * Device Risk Analysis
   */
  private async analyzeDeviceRisk(device: any): Promise<DeviceRisk> {
    const deviceId = device.device_id || 'unknown';

    return {
      device_id: deviceId,
      device_fingerprint: this.generateDeviceFingerprint(device),

      device_score: 25,
      device_trust_level: 'UNKNOWN',

      is_emulator: false,
      is_rooted: false,
      is_vpn: this.detectVPN(device.ip_address),
      is_proxy: false,
      is_tor: false,

      first_seen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date().toISOString(),
      total_sessions: 45,
      device_velocity: 1,

      current_location: {
        latitude: 5.6037,
        longitude: -0.1870,
        accuracy: 100,
        city: 'Accra',
        region: 'Greater Accra',
        country: 'GH',
        ip_address: device.ip_address,
        timestamp: new Date().toISOString(),
      },
      location_history: [],
      impossible_travel_detected: false,
    };
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(device: any): string {
    const components = [
      device.user_agent || '',
      device.ip_address || '',
      device.platform || '',
    ];

    return Buffer.from(components.join('|')).toString('base64').substring(0, 32);
  }

  /**
   * Detect VPN usage
   */
  private detectVPN(ipAddress: string): boolean {
    // In production, check against VPN IP databases
    // For now, simplified check
    const vpnRanges = ['10.', '172.', '192.168.'];
    return vpnRanges.some(range => ipAddress.startsWith(range));
  }

  /**
   * Behavioral Risk Analysis
   */
  private async analyzeBehavioralRisk(params: any): Promise<BehavioralRisk> {
    return {
      behavior_score: 20,
      behavior_anomaly_detected: false,

      session_duration_anomaly: false,
      interaction_pattern_anomaly: false,
      copy_paste_detected: false,
      autofill_used: false,

      human_typing_pattern: true,
      bot_probability: 0.05,

      consistent_with_history: true,
      deviation_score: 15,
    };
  }

  /**
   * Network Intelligence (cross-platform analysis)
   */
  private async analyzeNetworkIntelligence(user: any): Promise<NetworkIntelligence> {
    return {
      account_seen_count: 3,
      user_seen_count: 5,
      device_seen_count: 2,

      network_fraud_exposure: 0.02,
      connected_to_fraud_ring: false,
      fraud_ring_id: undefined,

      account_reputation_score: 85,
      user_reputation_score: 90,
      device_reputation_score: 80,

      total_successful_transactions: 234,
      total_failed_transactions: 5,
      total_disputed_transactions: 1,
      chargeback_rate: 0.004,
    };
  }

  /**
   * African-Specific Fraud Pattern Analysis
   */
  private async analyzeAfricanFraudPatterns(params: any): Promise<AfricanFraudIndicators> {
    return {
      // SIM Swap Fraud
      sim_swap_fraud: {
        detected: await this.detectSIMSwap(params.user.phone_number),
        confidence: 0.15,
        sim_swap_timestamp: undefined,
        mobile_operator: 'MTN',
      },

      // Agent Banking Fraud
      agent_fraud: {
        detected: false,
        agent_id: undefined,
        agent_location: undefined,
        suspicious_pattern: [],
      },

      // Cross-Border Fraud (e.g., Ghana-Nigeria scams)
      cross_border_fraud: {
        detected: false,
        source_country: 'GH',
        destination_country: 'GH',
        scam_type: undefined,
      },

      // Mobile Money Mule Accounts
      mule_account: {
        probability: 0.08,
        indicators: [],
        linked_accounts: [],
      },

      // Fake Agent Detection
      fake_agent: {
        detected: false,
        agent_verification_failed: false,
        location_mismatch: false,
      },
    };
  }

  /**
   * Calculate overall risk score using weighted ensemble
   */
  private calculateOverallRiskScore(factors: {
    fraudIndicators: FraudIndicators;
    amlIndicators: AMLIndicators;
    deviceRisk: DeviceRisk;
    behavioralRisk: BehavioralRisk;
    networkIntelligence: NetworkIntelligence;
    africanFraudIndicators: AfricanFraudIndicators;
  }): number {
    // Weighted scoring model (ML-based in production)
    let score = 0;

    // Fraud indicators weight: 35%
    if (factors.fraudIndicators.sim_swap_detected) score += 40;
    if (factors.fraudIndicators.unusual_amount) score += 15;
    if (factors.fraudIndicators.velocity_breach) score += 20;
    if (factors.fraudIndicators.account_takeover_score > 50) score += 25;

    // AML indicators weight: 25%
    if (factors.amlIndicators.sanctions_match) score += 50;
    if (factors.amlIndicators.pep_match) score += 30;
    if (factors.amlIndicators.structuring_detected) score += 35;
    if (factors.amlIndicators.aml_risk_level === 'HIGH') score += 25;

    // Device risk weight: 20%
    score += factors.deviceRisk.device_score * 0.2;
    if (factors.deviceRisk.is_vpn) score += 10;
    if (factors.deviceRisk.is_emulator) score += 15;
    if (factors.deviceRisk.device_trust_level === 'SUSPICIOUS') score += 20;

    // Behavioral risk weight: 10%
    score += factors.behavioralRisk.behavior_score * 0.1;
    score += factors.behavioralRisk.bot_probability * 20;

    // Network intelligence weight: 5%
    score += factors.networkIntelligence.network_fraud_exposure * 50;
    if (factors.networkIntelligence.connected_to_fraud_ring) score += 40;

    // African fraud patterns weight: 5%
    score += factors.africanFraudIndicators.sim_swap_fraud.confidence * 30;
    score += factors.africanFraudIndicators.mule_account.probability * 25;

    // Normalize to 0-100
    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  /**
   * Generate explainable risk factors (SHAP-like values)
   */
  private generateRiskFactors(factors: any) {
    const riskFactors: Array<{
      factor: string;
      factor_type: 'POSITIVE' | 'NEGATIVE';
      importance: number;
      value: string | number;
      description: string;
    }> = [];

    // SIM Swap Detection
    if (factors.fraudIndicators.sim_swap_detected) {
      riskFactors.push({
        factor: 'SIM_SWAP_DETECTED',
        factor_type: 'NEGATIVE',
        importance: 40,
        value: 'Yes',
        description: 'SIM card was recently swapped, high risk for mobile money fraud',
      });
    }

    // Unusual Amount
    if (factors.fraudIndicators.unusual_amount) {
      riskFactors.push({
        factor: 'UNUSUAL_AMOUNT',
        factor_type: 'NEGATIVE',
        importance: 15,
        value: 'Above average',
        description: 'Transaction amount significantly higher than user average',
      });
    }

    // Device Trust
    if (factors.deviceRisk.device_trust_level === 'TRUSTED') {
      riskFactors.push({
        factor: 'TRUSTED_DEVICE',
        factor_type: 'POSITIVE',
        importance: 20,
        value: 'Yes',
        description: 'Transaction from recognized and trusted device',
      });
    }

    // Network Reputation
    if (factors.networkIntelligence.user_reputation_score > 80) {
      riskFactors.push({
        factor: 'HIGH_REPUTATION',
        factor_type: 'POSITIVE',
        importance: 15,
        value: factors.networkIntelligence.user_reputation_score,
        description: 'User has strong reputation across ReshADX network',
      });
    }

    // VPN Usage
    if (factors.deviceRisk.is_vpn) {
      riskFactors.push({
        factor: 'VPN_DETECTED',
        factor_type: 'NEGATIVE',
        importance: 10,
        value: 'Yes',
        description: 'Transaction initiated through VPN or proxy',
      });
    }

    return riskFactors;
  }
}

// ============================================================================
// TRANSACTION MONITORING RULES ENGINE
// ============================================================================

export class RulesEngine {
  /**
   * Evaluate transaction against custom rules
   */
  static evaluateRules(transaction: any, rules: any[]): {
    triggered_rules: string[];
    should_block: boolean;
    should_review: boolean;
  } {
    const triggeredRules: string[] = [];
    let shouldBlock = false;
    let shouldReview = false;

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateConditions(transaction, rule.conditions);

      if (matches) {
        triggeredRules.push(rule.rule_name);

        if (rule.action === 'BLOCK') shouldBlock = true;
        if (rule.action === 'REVIEW') shouldReview = true;
      }
    }

    return {
      triggered_rules: triggeredRules,
      should_block: shouldBlock,
      should_review: shouldReview,
    };
  }

  /**
   * Evaluate rule conditions
   */
  private static evaluateConditions(transaction: any, conditions: any[]): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(transaction, condition.field);

      switch (condition.operator) {
        case '>':
          return value > condition.value;
        case '<':
          return value < condition.value;
        case '=':
          return value === condition.value;
        case '!=':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(condition.value);
        case 'not_contains':
          return !String(value).includes(condition.value);
        case 'in':
          return condition.value.includes(value);
        case 'not_in':
          return !condition.value.includes(value);
        default:
          return false;
      }
    });
  }

  /**
   * Get nested object value by path
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// ============================================================================
// SANCTIONS SCREENING
// ============================================================================

export class SanctionsScreening {
  /**
   * Screen against sanctions lists
   */
  static async screenName(name: string, country?: string): Promise<{
    match: boolean;
    lists: Array<{ list_name: string; confidence: number }>;
  }> {
    // In production, this would check against:
    // - OFAC (US Treasury)
    // - UN Security Council
    // - EU Sanctions
    // - UK HM Treasury
    // - Local African lists

    // Simulated screening
    const suspiciousNames = ['TERRORIST', 'SANCTIONED'];
    const match = suspiciousNames.some(s => name.toUpperCase().includes(s));

    return {
      match,
      lists: match ? [{ list_name: 'OFAC', confidence: 0.95 }] : [],
    };
  }

  /**
   * PEP (Politically Exposed Person) screening
   */
  static async screenPEP(name: string, country: string): Promise<{
    match: boolean;
    details?: any;
  }> {
    // In production, check against PEP databases
    return {
      match: false,
      details: undefined,
    };
  }
}

// ============================================================================
// VELOCITY CHECKING
// ============================================================================

export class VelocityChecker {
  /**
   * Check transaction velocity (frequency limits)
   */
  static async checkVelocity(userId: string, timeWindow: string): Promise<{
    count: number;
    limit: number;
    exceeded: boolean;
  }> {
    // In production, query database for transaction count in time window
    // For now, return mock data
    const count = 5;
    const limits: Record<string, number> = {
      '1h': 10,
      '24h': 50,
      '7d': 200,
    };

    const limit = limits[timeWindow] || 10;

    return {
      count,
      limit,
      exceeded: count > limit,
    };
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const fraudDetection = FraudDetectionEngine.getInstance();
