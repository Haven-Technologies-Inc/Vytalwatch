// ReshADX Transaction Enrichment API Types
// Equivalent to Plaid Enrich

// ============================================================================
// TRANSACTION ENRICHMENT
// ============================================================================

export interface EnrichedTransaction {
  // Original Transaction Data
  transaction_id: string;
  original_description: string;
  amount: number;
  currency: string;
  date: string;

  // Enriched Merchant Data
  merchant: MerchantData;

  // Categorization
  category: CategoryData;

  // Location Data
  location: LocationData;

  // Counterparties
  counterparties: Counterparty[];

  // Payment Details
  payment_meta: PaymentMetadata;

  // African-Specific Enrichment
  african_context: AfricanTransactionContext;

  // Enrichment Metadata
  enrichment_quality: 'HIGH' | 'MEDIUM' | 'LOW';
  enrichment_timestamp: string;
  model_version: string;
}

// ============================================================================
// MERCHANT DATA
// ============================================================================

export interface MerchantData {
  // Cleansed Merchant Name
  name: string;
  normalized_name: string;
  confidence: number;

  // Merchant Identification
  merchant_id?: string;
  merchant_category_code: string; // MCC code
  business_registration_number?: string;

  // Branding
  logo_url?: string;
  brand_color?: string;
  website?: string;

  // Business Information
  business_type: string;
  industry: string;
  sub_industry?: string;

  // Contact Information
  phone_number?: string;
  email?: string;
  social_media?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };

  // Merchant Category
  is_chain: boolean;
  parent_company?: string;
  brand_name?: string;

  // Verification
  verified_merchant: boolean;
  verification_source?: string;
}

// ============================================================================
// CATEGORY DATA
// ============================================================================

export interface CategoryData {
  // Primary Category (16 categories)
  primary: PrimaryCategory;
  primary_confidence: number;

  // Detailed Category (104 sub-categories)
  detailed: string;
  detailed_confidence: number;

  // African-Specific Categories
  african_category?: AfricanCategory;

  // Category Hierarchy
  hierarchy: string[];

  // Tags
  tags: string[];
}

export type PrimaryCategory =
  | 'INCOME'
  | 'TRANSFER'
  | 'LOAN_PAYMENTS'
  | 'BANK_FEES'
  | 'ENTERTAINMENT'
  | 'FOOD_AND_DRINK'
  | 'GENERAL_MERCHANDISE'
  | 'HOME_IMPROVEMENT'
  | 'MEDICAL'
  | 'PERSONAL_CARE'
  | 'GENERAL_SERVICES'
  | 'TRANSPORTATION'
  | 'TRAVEL'
  | 'RENT_AND_UTILITIES'
  | 'TAX'
  | 'GOVERNMENT_AND_NON_PROFIT';

export type AfricanCategory =
  | 'MOBILE_MONEY_TOPUP'
  | 'AIRTIME_PURCHASE'
  | 'DATA_PURCHASE'
  | 'SUSU_PAYMENT'
  | 'TROTRO_FARE'
  | 'OKADA_FARE'
  | 'MARKET_PURCHASE'
  | 'STREET_FOOD'
  | 'TITHE_OFFERING'
  | 'SCHOOL_FEES'
  | 'FUNERAL_CONTRIBUTION'
  | 'ENSTOOLMENT_FEE'
  | 'AGRICULTURAL_INPUT'
  | 'LIVESTOCK_PURCHASE'
  | 'LAND_PAYMENT'
  | 'BUILDING_MATERIALS'
  | 'GENERATOR_FUEL'
  | 'WATER_VENDOR'
  | 'CHARCOAL_FIREWOOD'
  | 'TRADITIONAL_MEDICINE';

// ============================================================================
// LOCATION DATA
// ============================================================================

export interface LocationData {
  // Address
  address: string;
  street?: string;
  city: string;
  region: string;
  postal_code?: string;
  country: string;

  // Geolocation
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };

  // Place Information
  place_id?: string;
  place_name?: string;
  place_type?: string;

  // Context
  neighborhood?: string;
  landmark?: string;
  is_online: boolean;
  is_in_store: boolean;

  // Store Information (for chains)
  store_number?: string;
  branch_name?: string;
}

// ============================================================================
// COUNTERPARTIES
// ============================================================================

export interface Counterparty {
  // Counterparty Information
  name: string;
  type: 'MERCHANT' | 'PAYMENT_TERMINAL' | 'MARKETPLACE' | 'FINANCIAL_INSTITUTION' | 'INDIVIDUAL';

  // Identification
  counterparty_id?: string;
  account_number?: string;
  mobile_number?: string;

  // Logo/Branding
  logo_url?: string;

  // Additional Context
  description?: string;
  confidence: number;
}

// ============================================================================
// PAYMENT METADATA
// ============================================================================

export interface PaymentMetadata {
  // Payment Method
  payment_method: 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'USSD' | 'QR_CODE' | 'AGENT';
  payment_channel: 'ONLINE' | 'IN_STORE' | 'ATM' | 'AGENT' | 'USSD' | 'OTHER';

  // Mobile Money Specific
  mobile_money_provider?: 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | 'MPESA' | 'ORANGE' | 'OTHER';
  mobile_number?: string;

  // Card Specific
  card_brand?: 'VISA' | 'MASTERCARD' | 'VERVE' | 'AMEX';
  card_last_four?: string;

  // Bank Transfer Specific
  bank_name?: string;
  account_type?: 'CHECKING' | 'SAVINGS' | 'MOBILE_MONEY';

  // Transaction Details
  reference_number?: string;
  transaction_code?: string;
  authorization_code?: string;

  // Fees
  transaction_fee?: number;
  service_charge?: number;
  total_amount_with_fees?: number;

  // Recipient/Sender
  recipient_name?: string;
  recipient_account?: string;
  sender_name?: string;
  sender_account?: string;
}

// ============================================================================
// AFRICAN TRANSACTION CONTEXT
// ============================================================================

export interface AfricanTransactionContext {
  // Informal Economy Indicators
  is_informal_transaction: boolean;
  informal_sector_type?: 'MARKET' | 'STREET_VENDOR' | 'ARTISAN' | 'TRANSPORT' | 'AGRICULTURE' | 'OTHER';

  // Community & Social Transactions
  is_community_transaction: boolean;
  community_type?: 'SUSU' | 'ROSCA' | 'FUNERAL' | 'WEDDING' | 'CHURCH' | 'MOSQUE' | 'FAMILY_SUPPORT';

  // Remittance Detection
  is_remittance: boolean;
  remittance_corridor?: string; // e.g., "US_TO_GH", "UK_TO_NG"
  remittance_provider?: string;

  // Agricultural Transaction
  is_agricultural: boolean;
  agricultural_type?: 'INPUT_PURCHASE' | 'HARVEST_SALE' | 'LIVESTOCK' | 'LAND' | 'EQUIPMENT';
  crop_type?: string;

  // Mobile Money Context
  is_mobile_money: boolean;
  mobile_money_type?: 'TRANSFER' | 'WITHDRAWAL' | 'DEPOSIT' | 'BILL_PAYMENT' | 'MERCHANT_PAYMENT' | 'AIRTIME';

  // Agent Banking Context
  is_agent_transaction: boolean;
  agent_id?: string;
  agent_location?: string;

  // Government/Public Services
  is_government_service: boolean;
  government_service_type?: 'TAX' | 'LICENSE' | 'PERMIT' | 'FINE' | 'PASSPORT' | 'UTILITY' | 'OTHER';

  // Cross-Border Transaction
  is_cross_border: boolean;
  origin_country?: string;
  destination_country?: string;
}

// ============================================================================
// ENRICHMENT REQUEST
// ============================================================================

export interface TransactionEnrichmentRequest {
  client_id: string;
  secret: string;

  // Transactions to Enrich (max 100)
  transactions: RawTransaction[];

  // Enrichment Options
  options?: {
    include_logo: boolean;
    include_location: boolean;
    include_african_context: boolean;
    language?: string; // For localized merchant names
  };
}

export interface RawTransaction {
  // Minimum Required Fields
  description: string;
  amount: number;
  currency: string;
  date: string;

  // Optional Context (helps with enrichment)
  transaction_id?: string;
  account_id?: string;
  merchant_name?: string;
  mcc_code?: string;
  location?: string;
  payment_method?: string;
}

export interface TransactionEnrichmentResponse {
  enriched_transactions: EnrichedTransaction[];
  request_id: string;
  enrichment_rate: number; // Percentage successfully enriched
}

// ============================================================================
// SPENDING INSIGHTS
// ============================================================================

export interface SpendingInsights {
  user_id: string;
  period: {
    start_date: string;
    end_date: string;
  };

  // Summary
  total_spend: number;
  total_income: number;
  net_cash_flow: number;
  average_daily_spend: number;

  // Category Breakdown
  spending_by_category: CategorySpending[];
  top_merchants: MerchantSpending[];

  // Trends
  spending_trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  month_over_month_change: number;

  // Patterns
  spending_patterns: SpendingPattern[];

  // Insights & Recommendations
  insights: string[];
  recommendations: string[];

  // Comparisons
  vs_previous_period: {
    total_spend_change: number;
    largest_increase_category: string;
    largest_decrease_category: string;
  };

  // African-Specific Insights
  african_insights: AfricanSpendingInsights;
}

export interface CategorySpending {
  category: string;
  total_amount: number;
  percentage_of_total: number;
  transaction_count: number;
  average_transaction: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface MerchantSpending {
  merchant_name: string;
  merchant_logo?: string;
  total_amount: number;
  transaction_count: number;
  last_transaction_date: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'OCCASIONAL';
}

export interface SpendingPattern {
  pattern_type: 'RECURRING' | 'SEASONAL' | 'OCCASIONAL' | 'ONE_TIME';
  description: string;
  merchants: string[];
  average_amount: number;
  frequency: string;
  next_expected_date?: string;
}

export interface AfricanSpendingInsights {
  // Mobile Money Usage
  mobile_money_percentage: number;
  preferred_mobile_money_provider: string;

  // Informal Economy Participation
  informal_sector_spend: number;
  informal_sector_percentage: number;

  // Community & Social
  community_contributions: number;
  susu_savings: number;
  religious_giving: number;

  // Agricultural Spending
  agricultural_input_spend?: number;
  harvest_income?: number;

  // Airtime & Data
  monthly_airtime_spend: number;
  monthly_data_spend: number;

  // Transport
  transport_spend: number;
  transport_mode_breakdown: {
    trotro: number;
    okada: number;
    taxi: number;
    uber_bolt: number;
  };

  // Education
  school_fees_paid: number;
  education_materials: number;

  // Utility Comparison
  utility_costs: {
    electricity: number;
    water: number;
    refuse: number;
  };
}

// ============================================================================
// MERCHANT LOOKUP
// ============================================================================

export interface MerchantLookupRequest {
  merchant_name: string;
  location?: string;
  country?: string;
}

export interface MerchantLookupResponse {
  merchants: MerchantData[];
  exact_match: boolean;
  request_id: string;
}

// ============================================================================
// CATEGORY TAXONOMY
// ============================================================================

export interface CategoryTaxonomy {
  primary_categories: CategoryDefinition[];
  detailed_categories: CategoryDefinition[];
  african_categories: CategoryDefinition[];
}

export interface CategoryDefinition {
  category_id: string;
  name: string;
  description: string;
  parent_category_id?: string;
  examples: string[];
  keywords: string[];
}
