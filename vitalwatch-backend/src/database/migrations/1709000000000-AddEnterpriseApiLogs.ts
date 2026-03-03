import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnterpriseApiLogs1709000000000 implements MigrationInterface {
  name = 'AddEnterpriseApiLogs1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "enterprise_api_logs_provider_enum" AS ENUM (
        'stripe', 'twilio', 'zeptomail', 'tenovi', 'openai', 'grok', 'clearinghouse', 'plaid', 'internal'
      )
    `);
    
    await queryRunner.query(`
      CREATE TYPE "enterprise_api_logs_severity_enum" AS ENUM (
        'debug', 'info', 'warn', 'error', 'critical'
      )
    `);
    
    await queryRunner.query(`
      CREATE TYPE "enterprise_api_logs_operation_enum" AS ENUM (
        'payment_intent_create', 'payment_intent_confirm', 'payment_refund',
        'subscription_create', 'subscription_update', 'subscription_cancel',
        'invoice_create', 'invoice_finalize', 'customer_create', 'customer_update',
        'webhook_received', 'sms_send', 'sms_receive', 'email_send', 'email_template',
        'voice_call', 'device_sync', 'device_register', 'device_unregister',
        'vitals_receive', 'device_status', 'ai_completion', 'ai_embedding',
        'ai_analysis', 'risk_score', 'soap_note', 'claim_submit', 'claim_status',
        'claim_batch', 'era_receive', 'eligibility_check', 'bank_link', 'bank_verify',
        'ach_transfer', 'api_request', 'api_response', 'health_check'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "enterprise_api_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" "enterprise_api_logs_provider_enum" NOT NULL,
        "operation" "enterprise_api_logs_operation_enum" NOT NULL,
        "severity" "enterprise_api_logs_severity_enum" NOT NULL DEFAULT 'info',
        "correlationId" uuid,
        "externalRequestId" varchar,
        "userId" varchar,
        "organizationId" varchar,
        "patientId" varchar,
        "endpoint" text,
        "method" varchar(10),
        "requestHeaders" jsonb,
        "requestBody" jsonb,
        "requestHash" varchar,
        "responseStatus" integer,
        "responseBody" jsonb,
        "responseHash" varchar,
        "success" boolean NOT NULL DEFAULT false,
        "errorMessage" text,
        "errorCode" varchar,
        "durationMs" integer,
        "ipAddress" varchar,
        "userAgent" text,
        "metadata" jsonb,
        "amount" decimal(12,2),
        "currency" varchar(3),
        "previousLogHash" varchar,
        "logHash" varchar,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "environment" varchar NOT NULL DEFAULT 'production',
        "serviceVersion" varchar,
        CONSTRAINT "PK_enterprise_api_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for efficient querying
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_provider_created" ON "enterprise_api_logs" ("provider", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_operation_created" ON "enterprise_api_logs" ("operation", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_severity_created" ON "enterprise_api_logs" ("severity", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_correlation" ON "enterprise_api_logs" ("correlationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_user" ON "enterprise_api_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_org_created" ON "enterprise_api_logs" ("organizationId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_success_created" ON "enterprise_api_logs" ("success", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_enterprise_logs_status_created" ON "enterprise_api_logs" ("responseStatus", "createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_status_created"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_success_created"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_org_created"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_user"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_correlation"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_severity_created"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_operation_created"`);
    await queryRunner.query(`DROP INDEX "IDX_enterprise_logs_provider_created"`);
    await queryRunner.query(`DROP TABLE "enterprise_api_logs"`);
    await queryRunner.query(`DROP TYPE "enterprise_api_logs_operation_enum"`);
    await queryRunner.query(`DROP TYPE "enterprise_api_logs_severity_enum"`);
    await queryRunner.query(`DROP TYPE "enterprise_api_logs_provider_enum"`);
  }
}
