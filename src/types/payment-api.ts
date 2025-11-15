// ReshADX Payment Initiation & Transfer API Types
// Equivalent to Plaid Transfer + Payment Initiation

// ============================================================================
// PAYMENT INITIATION
// ============================================================================

export interface PaymentInitiation {
  payment_id: string;
  client_id: string;
  user_id: string;

  // Payment Details
  amount: PaymentAmount;
  recipient: PaymentRecipient;
  sender_account_id?: string;

  // Payment Type
  payment_type: 'ONE_TIME' | 'RECURRING' | 'SCHEDULED';
  payment_method: 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CARD' | 'AGENT_CASH_OUT';

  // Status
  status: PaymentStatus;
  status_update_timestamp: string;

  // Metadata
  reference: string;
  description?: string;
  metadata?: Record<string, any>;

  // Timeline
  created_at: string;
  scheduled_for?: string;
  executed_at?: string;
  settled_at?: string;

  // Fees
  fees: PaymentFees;

  // Risk Assessment
  risk_assessment?: RiskAssessment;

  // Webhook
  webhook_url?: string;

  request_id: string;
}

export interface PaymentAmount {
  value: number;
  currency: string;
  original_amount?: number; // If currency conversion
  original_currency?: string;
  exchange_rate?: number;
}

export interface PaymentRecipient {
  recipient_type: 'BANK_ACCOUNT' | 'MOBILE_MONEY' | 'CARD' | 'CASH_PICKUP' | 'AGENT';

  // Bank Account
  bank_account?: {
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
    branch_code?: string;
    iban?: string;
    swift_code?: string;
  };

  // Mobile Money
  mobile_money?: {
    provider: 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | 'MPESA' | 'ORANGE' | 'AIRTEL' | 'TIGO' | 'OTHER';
    phone_number: string;
    account_name?: string;
    wallet_id?: string;
  };

  // Card
  card?: {
    card_number_last_four: string;
    card_brand: string;
    card_token: string;
  };

  // Cash Pickup
  cash_pickup?: {
    agent_network: string;
    pickup_code: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_id_type?: string;
    recipient_id_number?: string;
  };

  // Address
  address?: {
    street: string;
    city: string;
    region: string;
    postal_code?: string;
    country: string;
  };

  // Contact
  contact?: {
    name: string;
    email?: string;
    phone?: string;
  };

  // Verification
  recipient_verified: boolean;
  verification_method?: string;
}

export type PaymentStatus =
  | 'INITIATED' // Payment created
  | 'PENDING' // Awaiting user authorization
  | 'AUTHORIZING' // User is authorizing
  | 'AUTHORIZED' // User authorized, awaiting processing
  | 'PROCESSING' // Payment is being processed
  | 'SENT' // Payment sent to recipient
  | 'SETTLED' // Payment completed
  | 'FAILED' // Payment failed
  | 'CANCELLED' // Payment cancelled
  | 'REVERSED' // Payment reversed/refunded
  | 'ON_HOLD' // Payment on hold for review
  | 'REQUIRES_ACTION'; // User action needed

export interface PaymentFees {
  transaction_fee: number;
  service_charge: number;
  currency_conversion_fee?: number;
  agent_fee?: number;
  total_fees: number;
  fees_paid_by: 'SENDER' | 'RECIPIENT' | 'SPLIT';
}

// ============================================================================
// RECURRING PAYMENTS
// ============================================================================

export interface RecurringPayment {
  recurring_payment_id: string;
  payment_template: PaymentInitiation;

  // Recurrence Details
  frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  start_date: string;
  end_date?: string;
  next_payment_date: string;

  // Status
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  total_payments_made: number;
  total_payments_failed: number;

  // History
  payment_history: PaymentInitiation[];

  // Auto-retry
  retry_failed_payments: boolean;
  max_retries: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// BULK PAYMENTS
// ============================================================================

export interface BulkPayment {
  bulk_payment_id: string;
  client_id: string;

  // Payments
  payments: PaymentInitiation[];
  total_payments: number;

  // Summary
  total_amount: PaymentAmount;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;

  // Status
  status: 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';

  // Batch Details
  batch_name?: string;
  batch_reference: string;

  // Timeline
  created_at: string;
  started_at?: string;
  completed_at?: string;

  // File Upload (for large batches)
  uploaded_file_url?: string;
  file_format?: 'CSV' | 'EXCEL' | 'JSON';

  request_id: string;
}

// ============================================================================
// CROSS-BORDER PAYMENTS
// ============================================================================

export interface CrossBorderPayment {
  payment_id: string;

  // Countries
  origin_country: string;
  destination_country: string;
  corridor: string; // e.g., "GH_TO_NG", "US_TO_GH"

  // Amount
  send_amount: PaymentAmount;
  receive_amount: PaymentAmount;

  // Exchange Rate
  exchange_rate: number;
  exchange_rate_timestamp: string;
  rate_locked_until?: string;

  // Fees
  forex_fee: number;
  transfer_fee: number;
  total_fees: number;

  // Recipient
  recipient: PaymentRecipient;

  // Delivery Method
  delivery_method: 'BANK_ACCOUNT' | 'MOBILE_MONEY' | 'CASH_PICKUP' | 'HOME_DELIVERY';
  estimated_delivery_time: string;

  // Compliance
  purpose_of_transfer: string;
  source_of_funds: string;
  relationship_to_recipient?: string;

  // Remittance Tracking
  tracking_number: string;
  status: PaymentStatus;
}

// ============================================================================
// MOBILE MONEY PAYMENTS
// ============================================================================

export interface MobileMoneyPayment {
  payment_id: string;

  // Mobile Money Provider
  provider: 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | 'MPESA' | 'ORANGE' | 'AIRTEL' | 'TIGO';
  provider_transaction_id?: string;

  // Sender
  sender_phone: string;
  sender_name?: string;
  sender_wallet_id?: string;

  // Recipient
  recipient_phone: string;
  recipient_name?: string;
  recipient_wallet_id?: string;

  // Amount
  amount: number;
  currency: string;

  // Transaction Details
  transaction_type: 'P2P' | 'BILL_PAYMENT' | 'MERCHANT_PAYMENT' | 'CASH_OUT' | 'CASH_IN';
  reference: string;
  description?: string;

  // USSD Prompt (for fallback)
  ussd_code?: string; // e.g., "*170*1*amount*recipient#"

  // Status
  status: PaymentStatus;
  failure_reason?: string;

  // Confirmation
  confirmation_code?: string;
  confirmation_sms_sent: boolean;

  created_at: string;
  completed_at?: string;
}

// ============================================================================
// AGENT BANKING PAYMENTS
// ============================================================================

export interface AgentPayment {
  payment_id: string;

  // Agent Information
  agent_id: string;
  agent_name: string;
  agent_phone: string;
  agent_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  agent_network: string;

  // Transaction Details
  transaction_type: 'CASH_IN' | 'CASH_OUT' | 'BILL_PAYMENT' | 'FUNDS_TRANSFER';
  amount: number;
  currency: string;

  // Customer Information
  customer_phone: string;
  customer_name?: string;
  customer_account?: string;

  // Verification
  verification_method: 'PIN' | 'BIOMETRIC' | 'OTP' | 'QR_CODE';
  verification_status: 'PENDING' | 'VERIFIED' | 'FAILED';

  // Agent Float Management
  agent_balance_before: number;
  agent_balance_after: number;
  commission_earned: number;

  // Status
  status: PaymentStatus;

  // Timeline
  initiated_at: string;
  verified_at?: string;
  completed_at?: string;

  request_id: string;
}

// ============================================================================
// QR CODE PAYMENTS
// ============================================================================

export interface QRPayment {
  payment_id: string;

  // QR Code Details
  qr_code_id: string;
  qr_code_type: 'STATIC' | 'DYNAMIC';
  qr_code_data: string;
  qr_code_image_url?: string;

  // Merchant (for dynamic QR)
  merchant_id?: string;
  merchant_name?: string;

  // Amount (static QR has fixed amount, dynamic is variable)
  amount?: number;
  currency: string;

  // Customer
  customer_phone?: string;
  customer_account_id?: string;

  // Payment Standard
  qr_standard: 'GhQR' | 'NigeriaQR' | 'MPESA_QR' | 'MASTERPASS' | 'VISA_QR';

  // Status
  status: PaymentStatus;

  // Scan Details
  scanned_at?: string;
  scanned_location?: {
    latitude: number;
    longitude: number;
  };

  created_at: string;
  expires_at?: string;
}

// ============================================================================
// BILL PAYMENTS
// ============================================================================

export interface BillPayment {
  payment_id: string;

  // Biller Information
  biller_id: string;
  biller_name: string;
  biller_category: BillerCategory;

  // Bill Details
  bill_number: string;
  customer_account_number: string;
  bill_amount: number;
  currency: string;

  // Customer Details
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;

  // Payment Method
  payment_method: 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CARD';
  payment_source_id: string;

  // Fees
  convenience_fee: number;

  // Status
  status: PaymentStatus;
  payment_confirmation_number?: string;

  // Utility-Specific
  meter_number?: string; // For electricity
  decoder_number?: string; // For DSTV/Cable
  water_account?: string;

  // Due Date
  due_date?: string;
  late_payment_fee?: number;

  created_at: string;
  paid_at?: string;
}

export type BillerCategory =
  | 'ELECTRICITY'
  | 'WATER'
  | 'CABLE_TV'
  | 'INTERNET'
  | 'PHONE'
  | 'INSURANCE'
  | 'SCHOOL_FEES'
  | 'TAX'
  | 'GOVERNMENT_SERVICES'
  | 'MERCHANT'
  | 'OTHER';

// ============================================================================
// PAYMENT AUTHORIZATION
// ============================================================================

export interface PaymentAuthorization {
  authorization_id: string;
  payment_id: string;

  // Authorization Method
  method: 'SMS_OTP' | 'EMAIL_OTP' | 'BIOMETRIC' | 'PIN' | 'USSD' | 'PUSH_NOTIFICATION';

  // Status
  status: 'PENDING' | 'AUTHORIZED' | 'DECLINED' | 'EXPIRED';

  // Challenge
  challenge_code?: string;
  challenge_sent_at?: string;
  challenge_expires_at?: string;

  // Response
  user_response?: string;
  authorized_at?: string;
  declined_reason?: string;

  // Security
  ip_address: string;
  device_id?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };

  // Retry
  retry_count: number;
  max_retries: number;
}

// ============================================================================
// PAYMENT REQUESTS (Request Money)
// ============================================================================

export interface PaymentRequest {
  request_id: string;

  // Requester (who is asking for money)
  requester: {
    user_id: string;
    name: string;
    phone?: string;
    email?: string;
    account_id?: string;
  };

  // Payer (who will pay)
  payer: {
    user_id?: string;
    name?: string;
    phone: string;
    email?: string;
  };

  // Amount
  amount: number;
  currency: string;

  // Details
  description: string;
  reference?: string;
  invoice_url?: string;

  // Status
  status: 'PENDING' | 'PAID' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

  // Payment
  payment_id?: string; // Once paid
  paid_at?: string;

  // Expiry
  created_at: string;
  expires_at: string;

  // Notification
  notification_sent: boolean;
  reminder_count: number;
}

// ============================================================================
// PAYMENT DISPUTES & REFUNDS
// ============================================================================

export interface PaymentRefund {
  refund_id: string;
  original_payment_id: string;

  // Refund Amount
  refund_amount: number;
  currency: string;
  refund_reason: string;

  // Status
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  // Type
  refund_type: 'FULL' | 'PARTIAL';

  // Timeline
  requested_at: string;
  requested_by: string;
  processed_at?: string;
  completed_at?: string;

  // Destination
  refund_destination: 'ORIGINAL_SOURCE' | 'DIFFERENT_ACCOUNT';
  destination_account_id?: string;

  request_id: string;
}

// ============================================================================
// PAYMENT ANALYTICS
// ============================================================================

export interface PaymentAnalytics {
  client_id: string;
  period: {
    start_date: string;
    end_date: string;
  };

  // Volume
  total_payments: number;
  total_amount: PaymentAmount;
  average_payment_amount: number;

  // Success Metrics
  successful_payments: number;
  failed_payments: number;
  success_rate: number;

  // Payment Methods
  payment_method_breakdown: {
    bank_transfer: number;
    mobile_money: number;
    card: number;
    agent: number;
  };

  // Mobile Money Provider Breakdown
  mobile_money_provider_breakdown: {
    mtn: number;
    vodafone: number;
    mpesa: number;
    other: number;
  };

  // Speed
  average_settlement_time_minutes: number;
  fastest_payment_minutes: number;
  slowest_payment_minutes: number;

  // Top Recipients
  top_recipients: Array<{
    recipient_name: string;
    total_amount: number;
    payment_count: number;
  }>;

  // Failure Analysis
  failure_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;

  // Cross-Border
  cross_border_payments: number;
  cross_border_amount: number;
  top_corridors: Array<{
    corridor: string;
    payment_count: number;
    total_amount: number;
  }>;
}

// ============================================================================
// API REQUESTS & RESPONSES
// ============================================================================

export interface CreatePaymentRequest {
  client_id: string;
  secret: string;

  amount: PaymentAmount;
  recipient: PaymentRecipient;
  payment_method: string;

  sender_account_id?: string;
  access_token?: string;

  reference?: string;
  description?: string;
  metadata?: Record<string, any>;

  scheduled_for?: string;
  webhook_url?: string;
}

export interface CreatePaymentResponse {
  payment: PaymentInitiation;
  authorization_url?: string; // URL to redirect user for authorization
  request_id: string;
}

export interface GetPaymentStatusRequest {
  client_id: string;
  secret: string;
  payment_id: string;
}

export interface GetPaymentStatusResponse {
  payment: PaymentInitiation;
  request_id: string;
}

// ============================================================================
// RISK ASSESSMENT (from risk-api.ts)
// ============================================================================

interface RiskAssessment {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_action: 'APPROVE' | 'REVIEW' | 'CHALLENGE' | 'BLOCK';
}
