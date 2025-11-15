// ReshADX Risk & Fraud Detection API Types
// Equivalent to Plaid Signal + Protect

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

export interface RiskAssessment {
  risk_id: string;
  transaction_id?: string;
  account_id: string;
  user_id: string;
  timestamp: string;

  // Overall Risk Score (0-100, where 100 = highest risk)
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Risk Factors (SHAP values for explainability)
  risk_factors: RiskFactor[];

  // Specific Risk Categories
  fraud_indicators: FraudIndicators;
  aml_indicators: AMLIndicators;
  device_risk: DeviceRisk;
  behavioral_risk: BehavioralRisk;
  network_intelligence: NetworkIntelligence;

  // Recommendations
  recommended_action: 'APPROVE' | 'REVIEW' | 'CHALLENGE' | 'BLOCK';
  challenge_methods?: ChallengeMethod[];

  // Model Information
  model_version: string;
  model_confidence: number;

  request_id: string;
}

export interface RiskFactor {
  factor: string;
  factor_type: 'POSITIVE' | 'NEGATIVE'; // Positive = increases risk
  importance: number; // SHAP value
  value: string | number;
  description: string;
}

// ============================================================================
// FRAUD INDICATORS
// ============================================================================

export interface FraudIndicators {
  // Account Takeover
  account_takeover_score: number;
  suspicious_login: boolean;
  device_change_detected: boolean;
  location_change_detected: boolean;

  // SIM Swap Detection (Critical for Mobile Money)
  sim_swap_detected: boolean;
  sim_swap_date?: string;
  sim_swap_risk_score: number;

  // Transaction Pattern Anomalies
  unusual_amount: boolean;
  unusual_merchant: boolean;
  unusual_time: boolean;
  unusual_frequency: boolean;
  velocity_breach: boolean;

  // Network Fraud
  coordinated_fraud_ring: boolean;
  mule_account_probability: number;
  synthetic_identity_score: number;

  // Mobile Money Specific
  agent_fraud_risk: boolean;
  airtime_topup_pattern_suspicious: boolean;
  cross_network_anomaly: boolean;
}

// ============================================================================
// AML (Anti-Money Laundering) INDICATORS
// ============================================================================

export interface AMLIndicators {
  // Sanctions Screening
  sanctions_match: boolean;
  sanctions_lists: SanctionsList[];
  pep_match: boolean; // Politically Exposed Person
  pep_details?: PEPDetails;

  // Suspicious Activity
  structuring_detected: boolean; // Breaking up transactions to avoid reporting
  layering_detected: boolean; // Complex transfers to obscure origin
  placement_score: number; // Introducing illegal funds

  // High-Risk Indicators
  high_risk_country: boolean;
  high_risk_merchant: boolean;
  cash_intensive_business: boolean;

  // Transaction Monitoring
  large_cash_transaction: boolean;
  rapid_movement_of_funds: boolean;
  unusual_cross_border: boolean;

  // Regulatory Status
  aml_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  requires_sar: boolean; // Suspicious Activity Report
  requires_ctr: boolean; // Currency Transaction Report
}

export interface SanctionsList {
  list_name: 'OFAC' | 'UN' | 'EU' | 'LOCAL';
  match_confidence: number;
  matched_name: string;
  matched_country?: string;
}

export interface PEPDetails {
  name: string;
  position: string;
  country: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  source: string;
}

// ============================================================================
// DEVICE RISK
// ============================================================================

export interface DeviceRisk {
  device_id: string;
  device_fingerprint: string;

  // Device Intelligence
  device_score: number;
  device_trust_level: 'TRUSTED' | 'UNKNOWN' | 'SUSPICIOUS' | 'BLOCKED';

  // Device Attributes
  is_emulator: boolean;
  is_rooted: boolean;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;

  // Device History
  first_seen: string;
  last_seen: string;
  total_sessions: number;
  device_velocity: number; // Accounts linked in last 24h

  // Geolocation
  current_location: GeolocationData;
  location_history: GeolocationData[];
  impossible_travel_detected: boolean;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  region?: string;
  country: string;
  ip_address: string;
  timestamp: string;
}

// ============================================================================
// BEHAVIORAL RISK
// ============================================================================

export interface BehavioralRisk {
  // User Behavior Patterns
  behavior_score: number;
  behavior_anomaly_detected: boolean;

  // Session Behavior
  session_duration_anomaly: boolean;
  interaction_pattern_anomaly: boolean;
  copy_paste_detected: boolean;
  autofill_used: boolean;

  // Timing Analysis
  human_typing_pattern: boolean;
  bot_probability: number;

  // Historical Behavior
  consistent_with_history: boolean;
  deviation_score: number;
}

// ============================================================================
// NETWORK INTELLIGENCE
// ============================================================================

export interface NetworkIntelligence {
  // Cross-Platform Intelligence
  account_seen_count: number; // How many ReshADX apps have seen this account
  user_seen_count: number; // How many apps have seen this user
  device_seen_count: number;

  // Network Risk
  network_fraud_exposure: number;
  connected_to_fraud_ring: boolean;
  fraud_ring_id?: string;

  // Reputation
  account_reputation_score: number;
  user_reputation_score: number;
  device_reputation_score: number;

  // Historical Performance
  total_successful_transactions: number;
  total_failed_transactions: number;
  total_disputed_transactions: number;
  chargeback_rate: number;
}

// ============================================================================
// CHALLENGE METHODS
// ============================================================================

export type ChallengeMethod =
  | 'SMS_OTP'
  | 'EMAIL_OTP'
  | 'BIOMETRIC'
  | 'SECURITY_QUESTIONS'
  | 'DEVICE_VERIFICATION'
  | 'DOCUMENT_UPLOAD'
  | 'VIDEO_VERIFICATION'
  | 'AGENT_VERIFICATION';

// ============================================================================
// FRAUD DETECTION REQUEST
// ============================================================================

export interface FraudDetectionRequest {
  client_id: string;
  secret: string;

  // Transaction Details
  transaction: {
    amount: number;
    currency: string;
    merchant?: string;
    category?: string;
    description?: string;
    payment_method: 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CARD' | 'CASH';
  };

  // Account Information
  account_id?: string;
  access_token?: string;

  // User Information
  user: {
    user_id: string;
    phone_number?: string;
    email?: string;
    ip_address: string;
  };

  // Device Information
  device: {
    device_id?: string;
    device_fingerprint?: string;
    user_agent?: string;
    platform?: 'WEB' | 'IOS' | 'ANDROID';
    app_version?: string;
  };

  // Context
  timestamp: string;
  session_id?: string;
}

export interface FraudDetectionResponse {
  risk_assessment: RiskAssessment;
  request_id: string;
}

// ============================================================================
// TRANSACTION MONITORING
// ============================================================================

export interface TransactionMonitoringRule {
  rule_id: string;
  rule_name: string;
  rule_type: 'VELOCITY' | 'AMOUNT' | 'PATTERN' | 'CUSTOM';
  enabled: boolean;

  // Conditions
  conditions: RuleCondition[];

  // Actions
  action: 'ALERT' | 'BLOCK' | 'REVIEW' | 'CHALLENGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface RuleCondition {
  field: string;
  operator: '>' | '<' | '=' | '!=' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
  time_window?: string; // e.g., "24h", "7d"
}

// ============================================================================
// WATCHLIST MANAGEMENT
// ============================================================================

export interface WatchlistEntry {
  entry_id: string;
  entry_type: 'ACCOUNT' | 'USER' | 'DEVICE' | 'IP' | 'PHONE';
  value: string;

  // Classification
  list_type: 'BLOCKLIST' | 'ALLOWLIST' | 'WATCHLIST';
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';

  // Status
  active: boolean;
  expires_at?: string;

  // Metadata
  added_by: string;
  added_at: string;
  notes?: string;
}

// ============================================================================
// DISPUTE & CHARGEBACK
// ============================================================================

export interface Dispute {
  dispute_id: string;
  transaction_id: string;
  account_id: string;

  // Dispute Details
  dispute_type: 'FRAUD' | 'NOT_AUTHORIZED' | 'DUPLICATE' | 'INCORRECT_AMOUNT' | 'SERVICE_NOT_PROVIDED' | 'OTHER';
  amount: number;
  currency: string;

  // Status
  status: 'OPENED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  resolution?: 'CUSTOMER_FAVOR' | 'MERCHANT_FAVOR' | 'PARTIAL_REFUND';

  // Evidence
  customer_description: string;
  merchant_response?: string;
  evidence_documents: string[];

  // Timeline
  filed_at: string;
  resolved_at?: string;
  deadline: string;

  request_id: string;
}

// ============================================================================
// AFRICAN-SPECIFIC FRAUD TYPES
// ============================================================================

export interface AfricanFraudIndicators {
  // SIM Swap Fraud (Major issue in Africa)
  sim_swap_fraud: {
    detected: boolean;
    confidence: number;
    sim_swap_timestamp?: string;
    mobile_operator: string;
  };

  // Agent Banking Fraud
  agent_fraud: {
    detected: boolean;
    agent_id?: string;
    agent_location?: GeolocationData;
    suspicious_pattern: string[];
  };

  // Cross-Border Fraud (Ghana-Nigeria scams)
  cross_border_fraud: {
    detected: boolean;
    source_country: string;
    destination_country: string;
    scam_type?: 'ROMANCE' | 'INVESTMENT' | 'LOTTERY' | 'EMPLOYMENT' | 'OTHER';
  };

  // Mobile Money Mule Accounts
  mule_account: {
    probability: number;
    indicators: string[];
    linked_accounts: string[];
  };

  // Fake Agent Detection
  fake_agent: {
    detected: boolean;
    agent_verification_failed: boolean;
    location_mismatch: boolean;
  };
}

// ============================================================================
// RISK SETTINGS
// ============================================================================

export interface RiskSettings {
  client_id: string;

  // Risk Tolerance
  risk_tolerance: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  auto_block_threshold: number; // Score above which to auto-block (e.g., 90)
  manual_review_threshold: number; // Score above which to flag for review (e.g., 70)

  // Enabled Features
  fraud_detection_enabled: boolean;
  aml_screening_enabled: boolean;
  device_intelligence_enabled: boolean;
  behavioral_analysis_enabled: boolean;
  network_intelligence_enabled: boolean;

  // African-Specific
  sim_swap_detection_enabled: boolean;
  agent_fraud_detection_enabled: boolean;
  cross_border_monitoring_enabled: boolean;

  // Notifications
  webhook_url?: string;
  email_alerts: boolean;
  sms_alerts: boolean;
  alert_recipients: string[];

  // Custom Rules
  custom_rules: TransactionMonitoringRule[];
}

// ============================================================================
// RISK ANALYTICS
// ============================================================================

export interface RiskAnalytics {
  period: {
    start_date: string;
    end_date: string;
  };

  // Volume Metrics
  total_assessments: number;
  total_transactions_blocked: number;
  total_transactions_challenged: number;
  total_transactions_approved: number;

  // Fraud Metrics
  fraud_detected_count: number;
  fraud_prevented_amount: number;
  false_positive_rate: number;

  // Risk Distribution
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  // Top Fraud Types
  top_fraud_types: Array<{
    type: string;
    count: number;
    amount: number;
  }>;

  // Geographic Analysis
  high_risk_countries: Array<{
    country: string;
    risk_score: number;
    transaction_count: number;
  }>;

  // Model Performance
  model_performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
  };
}
