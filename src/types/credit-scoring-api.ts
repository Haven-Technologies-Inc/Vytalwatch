// ReshADX Credit Scoring API Types
// Revolutionary credit scoring using alternative African data

// ============================================================================
// CREDIT SCORE
// ============================================================================

export interface CreditScore {
  score_id: string;
  user_id: string;
  account_id?: string;

  // Core Score (300-850 scale, like FICO)
  credit_score: number;
  score_band: 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT';
  percentile: number; // User is better than X% of population

  // Risk Assessment
  default_probability: number; // 0-1 probability of default
  risk_grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

  // Credit Recommendation
  recommended_credit_limit: number;
  recommended_interest_rate: number;
  recommended_loan_term_months: number;

  // Score Breakdown (what contributed to the score)
  score_factors: ScoreFactor[];

  // Alternative Data Insights
  alternative_data_score: AlternativeDataScore;

  // Model Information
  model_version: string;
  model_confidence: number;
  scored_at: string;
  expires_at: string; // Scores expire after 90 days

  request_id: string;
}

export interface ScoreFactor {
  category: string;
  impact: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  importance: number; // SHAP value (0-100)
  description: string;
  value?: string | number;
}

// ============================================================================
// ALTERNATIVE DATA SCORE
// ============================================================================

export interface AlternativeDataScore {
  // Mobile Money Behavior
  mobile_money_score: number;
  mobile_money_insights: {
    average_balance: number;
    transaction_frequency: number;
    merchant_payment_consistency: number;
    savings_behavior_score: number;
    has_mobile_loan_history: boolean;
    mobile_loan_repayment_score?: number;
  };

  // Airtime & Data Usage (Strong indicator of stability)
  telecom_score: number;
  telecom_insights: {
    monthly_airtime_spend: number;
    airtime_purchase_consistency: number;
    data_usage_pattern: 'REGULAR' | 'IRREGULAR' | 'NONE';
    has_postpaid_contract: boolean;
    payment_timeliness_score?: number;
  };

  // Utility Payments
  utility_score: number;
  utility_insights: {
    electricity_payment_history: PaymentHistory[];
    water_payment_history: PaymentHistory[];
    cable_tv_payment_history: PaymentHistory[];
    on_time_payment_rate: number;
  };

  // Employment & Income Stability
  employment_score: number;
  employment_insights: {
    verified_employer: boolean;
    employer_name?: string;
    monthly_income_estimate: number;
    income_stability_score: number;
    employment_duration_months?: number;
    has_ssnit_contributions: boolean; // Ghana Social Security
  };

  // Education
  education_score: number;
  education_insights: {
    highest_qualification?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'POSTGRADUATE';
    verified_degree: boolean;
    school_fees_payment_history: PaymentHistory[];
    educational_institution?: string;
  };

  // Social & Professional Networks
  social_score: number;
  social_insights: {
    linkedin_verified: boolean;
    professional_licenses: string[];
    cooperative_membership: boolean;
    susu_participation: boolean;
    references_score: number;
  };

  // Agricultural Data (for farmers)
  agricultural_score?: number;
  agricultural_insights?: {
    land_ownership_verified: boolean;
    land_size_hectares?: number;
    crop_types: string[];
    input_purchase_history: PaymentHistory[];
    harvest_sales_history: number[];
    cooperative_membership: boolean;
  };

  // Geolocation Stability
  location_score: number;
  location_insights: {
    home_stability_months: number;
    work_stability_months: number;
    location_consistency_score: number;
    urban_rural_classification: 'URBAN' | 'PERI_URBAN' | 'RURAL';
  };

  // Digital Footprint
  digital_footprint_score: number;
  digital_insights: {
    smartphone_ownership: boolean;
    internet_usage_pattern: 'HEAVY' | 'MODERATE' | 'LIGHT' | 'NONE';
    social_media_presence: boolean;
    online_shopping_history: boolean;
    digital_literacy_score: number;
  };

  // Psychometric Assessment
  psychometric_score?: number;
  psychometric_insights?: {
    financial_discipline_score: number;
    risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
    honesty_score: number;
    numeracy_score: number;
    completed_at?: string;
  };
}

export interface PaymentHistory {
  vendor: string;
  payment_date: string;
  amount: number;
  on_time: boolean;
  days_late?: number;
}

// ============================================================================
// INCOME VERIFICATION
// ============================================================================

export interface IncomeVerification {
  verification_id: string;
  user_id: string;
  account_id: string;

  // Income Summary
  estimated_monthly_income: number;
  income_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  income_stability: 'VERY_STABLE' | 'STABLE' | 'VARIABLE' | 'IRREGULAR';

  // Income Streams
  income_streams: IncomeStream[];
  primary_income_stream?: IncomeStream;

  // Historical Analysis
  last_6_months_income: number[];
  last_12_months_income: number[];
  income_trend: 'INCREASING' | 'STABLE' | 'DECREASING';

  // Income Categories
  employment_income: number;
  business_income: number;
  rental_income: number;
  investment_income: number;
  remittance_income: number;
  government_benefits: number;
  other_income: number;

  // Employment Verification
  employment_verified: boolean;
  employer_name?: string;
  employer_verification_method?: 'SSNIT' | 'PAYSLIP' | 'EMPLOYER_LETTER' | 'BANK_DEPOSITS';

  // Affordability Assessment
  affordability_analysis: AffordabilityAnalysis;

  verified_at: string;
  request_id: string;
}

export interface IncomeStream {
  stream_id: string;
  stream_name: string;
  stream_type: 'EMPLOYMENT' | 'BUSINESS' | 'RENTAL' | 'INVESTMENT' | 'REMITTANCE' | 'GIG_ECONOMY' | 'OTHER';

  // Income Metrics
  monthly_amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'IRREGULAR';
  consistency_score: number; // 0-100

  // Detection Metadata
  detected_from: 'BANK_DEPOSITS' | 'MOBILE_MONEY' | 'SSNIT' | 'MANUAL';
  first_detected: string;
  last_detected: string;
  transaction_count: number;
}

export interface AffordabilityAnalysis {
  // Income vs Expenses
  total_monthly_income: number;
  total_monthly_expenses: number;
  disposable_income: number;
  debt_to_income_ratio: number;

  // Affordability for Loan
  max_affordable_monthly_payment: number;
  max_affordable_loan_amount: number;
  recommended_loan_term_months: number;

  // Risk Indicators
  over_leveraged: boolean;
  high_expense_volatility: boolean;
  negative_cash_flow_months: number;
}

// ============================================================================
// CREDIT REPORT
// ============================================================================

export interface CreditReport {
  report_id: string;
  user_id: string;
  generated_at: string;

  // Personal Information
  personal_info: {
    full_name: string;
    date_of_birth: string;
    national_id: string;
    phone_numbers: string[];
    email_addresses: string[];
    addresses: Address[];
  };

  // Credit Score
  credit_score: CreditScore;

  // Credit Accounts
  credit_accounts: CreditAccount[];

  // Payment History
  payment_history: {
    on_time_payments: number;
    late_payments: number;
    missed_payments: number;
    on_time_percentage: number;
  };

  // Credit Utilization
  credit_utilization: {
    total_credit_limit: number;
    total_credit_used: number;
    utilization_percentage: number;
  };

  // Public Records
  public_records: PublicRecord[];

  // Inquiries (who has checked your credit)
  inquiries: CreditInquiry[];

  // Recommendations
  recommendations: string[];
}

export interface Address {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region: string;
  postal_code?: string;
  country: string;
  residence_type: 'OWN' | 'RENT' | 'FAMILY' | 'OTHER';
  duration_months: number;
}

export interface CreditAccount {
  account_id: string;
  account_type: 'MOBILE_LOAN' | 'BANK_LOAN' | 'MICROFINANCE' | 'CREDIT_CARD' | 'OVERDRAFT' | 'HIRE_PURCHASE';
  lender: string;

  // Account Details
  opened_date: string;
  closed_date?: string;
  status: 'OPEN' | 'CLOSED' | 'DEFAULTED' | 'WRITTEN_OFF';

  // Amounts
  original_amount: number;
  current_balance: number;
  credit_limit?: number;

  // Payment Performance
  payment_status: 'CURRENT' | 'LATE_30' | 'LATE_60' | 'LATE_90' | 'DEFAULT';
  days_past_due: number;
  total_payments_made: number;
  missed_payments: number;

  // Terms
  interest_rate?: number;
  monthly_payment?: number;
  term_months?: number;
}

export interface PublicRecord {
  record_type: 'BANKRUPTCY' | 'JUDGMENT' | 'LIEN' | 'FORECLOSURE';
  filed_date: string;
  status: 'ACTIVE' | 'SATISFIED' | 'DISMISSED';
  amount?: number;
  court?: string;
}

export interface CreditInquiry {
  inquiry_id: string;
  inquirer_name: string;
  inquiry_type: 'HARD' | 'SOFT';
  inquiry_date: string;
  purpose: 'LOAN_APPLICATION' | 'CREDIT_CARD' | 'EMPLOYMENT' | 'ACCOUNT_REVIEW' | 'OTHER';
}

// ============================================================================
// CREDIT SCORE REQUEST
// ============================================================================

export interface CreditScoreRequest {
  client_id: string;
  secret: string;

  // User Identification
  user: {
    user_id: string;
    phone_number?: string;
    email?: string;
    national_id?: string; // Ghana Card, NIN, etc.
  };

  // Data Sources
  access_token?: string; // For linked bank/mobile money accounts
  include_alternative_data: boolean;
  include_psychometric_assessment: boolean;

  // Consent
  user_consent: boolean;
  consent_timestamp: string;
}

export interface CreditScoreResponse {
  credit_score: CreditScore;
  request_id: string;
}

// ============================================================================
// PSYCHOMETRIC ASSESSMENT
// ============================================================================

export interface PsychometricAssessment {
  assessment_id: string;
  user_id: string;

  // Assessment Details
  started_at: string;
  completed_at: string;
  duration_seconds: number;

  // Scores
  financial_discipline_score: number;
  honesty_score: number;
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  numeracy_score: number;
  decision_making_score: number;

  // Detailed Results
  questions_answered: number;
  correct_answers: number;
  behavioral_traits: {
    impulsiveness: number;
    patience: number;
    planning: number;
    responsibility: number;
  };

  // Validity Checks
  valid_assessment: boolean;
  red_flags: string[];
}

// ============================================================================
// CREDIT BUILDER PROGRAM
// ============================================================================

export interface CreditBuilderProgram {
  program_id: string;
  user_id: string;

  // Program Status
  enrolled_at: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

  // Progress
  current_score: number;
  starting_score: number;
  target_score: number;
  progress_percentage: number;

  // Milestones
  milestones_completed: Milestone[];
  next_milestone: Milestone;

  // Recommendations
  personalized_actions: CreditAction[];
}

export interface Milestone {
  milestone_id: string;
  title: string;
  description: string;
  score_improvement: number;
  completed: boolean;
  completed_at?: string;
}

export interface CreditAction {
  action_id: string;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'EASY' | 'MODERATE' | 'DIFFICULT';
  potential_score_increase: number;
  deadline?: string;
}
