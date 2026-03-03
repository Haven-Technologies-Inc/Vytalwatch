import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import * as crypto from 'crypto';

/**
 * API Provider categories for external service calls
 */
export enum ApiProvider {
  STRIPE = 'stripe',
  TWILIO = 'twilio',
  ZEPTOMAIL = 'zeptomail',
  TENOVI = 'tenovi',
  OPENAI = 'openai',
  GROK = 'grok',
  CLEARINGHOUSE = 'clearinghouse',
  PLAID = 'plaid',
  INTERNAL = 'internal',
}

/**
 * Log severity levels
 */
export enum LogSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * API operation categories
 */
export enum ApiOperation {
  // Payment operations
  PAYMENT_INTENT_CREATE = 'payment_intent_create',
  PAYMENT_INTENT_CONFIRM = 'payment_intent_confirm',
  PAYMENT_REFUND = 'payment_refund',
  SUBSCRIPTION_CREATE = 'subscription_create',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
  INVOICE_CREATE = 'invoice_create',
  INVOICE_FINALIZE = 'invoice_finalize',
  CUSTOMER_CREATE = 'customer_create',
  CUSTOMER_UPDATE = 'customer_update',
  WEBHOOK_RECEIVED = 'webhook_received',

  // Communication operations
  SMS_SEND = 'sms_send',
  SMS_RECEIVE = 'sms_receive',
  EMAIL_SEND = 'email_send',
  EMAIL_TEMPLATE = 'email_template',
  VOICE_CALL = 'voice_call',

  // Device operations
  DEVICE_SYNC = 'device_sync',
  DEVICE_REGISTER = 'device_register',
  DEVICE_UNREGISTER = 'device_unregister',
  VITALS_RECEIVE = 'vitals_receive',
  DEVICE_STATUS = 'device_status',

  // AI operations
  AI_COMPLETION = 'ai_completion',
  AI_EMBEDDING = 'ai_embedding',
  AI_ANALYSIS = 'ai_analysis',
  RISK_SCORE = 'risk_score',
  SOAP_NOTE = 'soap_note',

  // Claims operations
  CLAIM_SUBMIT = 'claim_submit',
  CLAIM_STATUS = 'claim_status',
  CLAIM_BATCH = 'claim_batch',
  ERA_RECEIVE = 'era_receive',
  ELIGIBILITY_CHECK = 'eligibility_check',

  // Banking operations
  BANK_LINK = 'bank_link',
  BANK_VERIFY = 'bank_verify',
  ACH_TRANSFER = 'ach_transfer',

  // Generic
  API_REQUEST = 'api_request',
  API_RESPONSE = 'api_response',
  HEALTH_CHECK = 'health_check',
}

/**
 * Enterprise API Audit Log Entity
 * 
 * IMMUTABLE BY DESIGN:
 * - No @UpdateDateColumn
 * - No update methods in repository
 * - Hash chain for tamper detection
 * - Indexed for fast audit queries
 */
@Entity('enterprise_api_logs')
@Index(['provider', 'createdAt'])
@Index(['operation', 'createdAt'])
@Index(['severity', 'createdAt'])
@Index(['correlationId'])
@Index(['userId'])
@Index(['organizationId', 'createdAt'])
@Index(['success', 'createdAt'])
@Index(['responseStatus', 'createdAt'])
export class EnterpriseApiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * External API provider
   */
  @Column({ type: 'enum', enum: ApiProvider })
  provider: ApiProvider;

  /**
   * Specific operation performed
   */
  @Column({ type: 'enum', enum: ApiOperation })
  operation: ApiOperation;

  /**
   * Log severity level
   */
  @Column({ type: 'enum', enum: LogSeverity, default: LogSeverity.INFO })
  severity: LogSeverity;

  /**
   * Correlation ID for tracing requests across services
   */
  @Column({ type: 'uuid', nullable: true })
  correlationId: string;

  /**
   * Request ID from external provider (if available)
   */
  @Column({ nullable: true })
  externalRequestId: string;

  /**
   * User who initiated the action (if applicable)
   */
  @Column({ nullable: true })
  userId: string;

  /**
   * Organization context
   */
  @Column({ nullable: true })
  organizationId: string;

  /**
   * Patient ID (for HIPAA compliance tracking)
   */
  @Column({ nullable: true })
  patientId: string;

  /**
   * Request endpoint/URL (sanitized)
   */
  @Column({ type: 'text', nullable: true })
  endpoint: string;

  /**
   * HTTP method
   */
  @Column({ length: 10, nullable: true })
  method: string;

  /**
   * Request headers (sanitized - no auth tokens)
   */
  @Column({ type: 'jsonb', nullable: true })
  requestHeaders: Record<string, string>;

  /**
   * Request body (sanitized - PHI redacted)
   */
  @Column({ type: 'jsonb', nullable: true })
  requestBody: Record<string, any>;

  /**
   * Request body hash for integrity verification
   */
  @Column({ nullable: true })
  requestHash: string;

  /**
   * Response HTTP status code
   */
  @Column({ nullable: true })
  responseStatus: number;

  /**
   * Response body (sanitized - PHI redacted)
   */
  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, any>;

  /**
   * Response body hash for integrity verification
   */
  @Column({ nullable: true })
  responseHash: string;

  /**
   * Whether the API call was successful
   */
  @Column({ default: false })
  success: boolean;

  /**
   * Error message if failed
   */
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  /**
   * Error code from provider
   */
  @Column({ nullable: true })
  errorCode: string;

  /**
   * Request duration in milliseconds
   */
  @Column({ type: 'int', nullable: true })
  durationMs: number;

  /**
   * IP address of the requester
   */
  @Column({ nullable: true })
  ipAddress: string;

  /**
   * User agent string
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /**
   * Additional metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * Amount involved (for financial transactions)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number;

  /**
   * Currency code (for financial transactions)
   */
  @Column({ length: 3, nullable: true })
  currency: string;

  /**
   * Hash of the previous log entry (blockchain-style chain)
   */
  @Column({ nullable: true })
  previousLogHash: string;

  /**
   * Hash of this log entry (for integrity verification)
   */
  @Column({ nullable: true })
  logHash: string;

  /**
   * Timestamp - immutable, set once on creation
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Environment (production, staging, development)
   */
  @Column({ default: 'production' })
  environment: string;

  /**
   * Service version that created this log
   */
  @Column({ nullable: true })
  serviceVersion: string;

  /**
   * Generate hash before insert for tamper detection
   */
  @BeforeInsert()
  generateHash() {
    const data = JSON.stringify({
      provider: this.provider,
      operation: this.operation,
      correlationId: this.correlationId,
      userId: this.userId,
      endpoint: this.endpoint,
      requestHash: this.requestHash,
      responseHash: this.responseHash,
      success: this.success,
      previousLogHash: this.previousLogHash,
      timestamp: new Date().toISOString(),
    });
    this.logHash = crypto.createHash('sha256').update(data).digest('hex');
  }
}
