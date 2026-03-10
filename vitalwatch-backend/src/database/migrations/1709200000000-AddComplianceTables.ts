import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplianceTables1709200000000 implements MigrationInterface {
  name = 'AddComplianceTables1709200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PHI Access Type enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "phi_access_type_enum" AS ENUM (
        'view', 'create', 'update', 'delete', 'export', 'print', 'share'
      ); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // PHI Resource Type enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "phi_resource_type_enum" AS ENUM (
        'patient_record', 'vital_reading', 'clinical_note', 'claim',
        'medication', 'diagnosis', 'insurance', 'billing', 'report'
      ); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // PHI Access Logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "phi_access_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "userName" varchar,
        "userRole" varchar,
        "patientId" uuid,
        "patientName" varchar,
        "resourceType" "phi_resource_type_enum" NOT NULL,
        "resourceId" uuid,
        "accessType" "phi_access_type_enum" NOT NULL,
        "fieldsAccessed" text,
        "accessReason" varchar,
        "ipAddress" varchar,
        "userAgent" varchar,
        "sessionId" varchar,
        "organizationId" varchar,
        "metadata" jsonb,
        "emergencyAccess" boolean NOT NULL DEFAULT false,
        "emergencyReason" varchar,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_phi_access_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_phi_logs_user_created" ON "phi_access_logs" ("userId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_phi_logs_patient_created" ON "phi_access_logs" ("patientId", "createdAt")
    `);

    // Consent Type enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "consent_type_enum" AS ENUM (
        'rpm_monitoring', 'data_sharing', 'telehealth', 'marketing',
        'research', 'billing_auth', 'hipaa_notice', 'treatment'
      ); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Consent Status enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "consent_status_enum" AS ENUM (
        'pending', 'granted', 'revoked', 'expired'
      ); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Patient Consents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" uuid NOT NULL,
        "consentType" "consent_type_enum" NOT NULL,
        "status" "consent_status_enum" NOT NULL DEFAULT 'pending',
        "description" text,
        "consentText" text,
        "documentVersion" varchar,
        "grantedAt" TIMESTAMP WITH TIME ZONE,
        "grantedBy" varchar,
        "grantMethod" varchar,
        "signatureData" varchar,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "revokedBy" varchar,
        "revocationReason" varchar,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "organizationId" varchar,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_consents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_consents_patient_type" ON "patient_consents" ("patientId", "consentType")
    `);

    // BAA Status enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "baa_status_enum" AS ENUM (
        'draft', 'pending_signature', 'active', 'expired', 'terminated'
      ); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // BAA Party Type enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "baa_party_type_enum" AS ENUM (
        'covered_entity', 'business_associate', 'subcontractor'
      ); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Business Associate Agreements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "business_associate_agreements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agreementNumber" varchar NOT NULL,
        "partyName" varchar NOT NULL,
        "partyType" "baa_party_type_enum" NOT NULL,
        "partyContact" varchar,
        "partyEmail" varchar,
        "status" "baa_status_enum" NOT NULL DEFAULT 'draft',
        "effectiveDate" date NOT NULL,
        "expiresAt" date,
        "scopeOfServices" text,
        "permittedUses" text,
        "permittedDisclosures" text,
        "documentUrl" varchar,
        "signedByUs" varchar,
        "signedByUsAt" TIMESTAMP WITH TIME ZONE,
        "signedByThem" varchar,
        "signedByThemAt" TIMESTAMP WITH TIME ZONE,
        "terminatedAt" TIMESTAMP WITH TIME ZONE,
        "terminationReason" varchar,
        "organizationId" varchar,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_baa" PRIMARY KEY ("id")
      )
    `);

    // Retention Action enum
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE "retention_action_enum" AS ENUM ('archive', 'delete', 'anonymize'); EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Data Retention Policies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_retention_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "resourceType" varchar NOT NULL,
        "retentionDays" integer NOT NULL,
        "action" "retention_action_enum" NOT NULL DEFAULT 'archive',
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "organizationId" varchar,
        "lastExecutedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_retention_policies" PRIMARY KEY ("id")
      )
    `);

    // Insert default retention policies
    await queryRunner.query(`
      INSERT INTO "data_retention_policies" ("name", "resourceType", "retentionDays", "action", "description")
      SELECT * FROM (VALUES
        ('Vital Readings', 'vital_reading', 2555, 'archive'::"retention_action_enum", 'HIPAA requires 7 years retention'),
        ('Clinical Notes', 'clinical_note', 2555, 'archive'::"retention_action_enum", 'HIPAA requires 7 years retention'),
        ('PHI Access Logs', 'phi_access_log', 2190, 'archive'::"retention_action_enum", 'HIPAA requires 6 years for audit logs'),
        ('Claims', 'claim', 2555, 'archive'::"retention_action_enum", 'HIPAA requires 7 years retention')
      ) AS v("name", "resourceType", "retentionDays", "action", "description")
      WHERE NOT EXISTS (SELECT 1 FROM "data_retention_policies" LIMIT 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "data_retention_policies"`);
    await queryRunner.query(`DROP TABLE "business_associate_agreements"`);
    await queryRunner.query(`DROP TABLE "patient_consents"`);
    await queryRunner.query(`DROP TABLE "phi_access_logs"`);
    await queryRunner.query(`DROP TYPE "retention_action_enum"`);
    await queryRunner.query(`DROP TYPE "baa_party_type_enum"`);
    await queryRunner.query(`DROP TYPE "baa_status_enum"`);
    await queryRunner.query(`DROP TYPE "consent_status_enum"`);
    await queryRunner.query(`DROP TYPE "consent_type_enum"`);
    await queryRunner.query(`DROP TYPE "phi_resource_type_enum"`);
    await queryRunner.query(`DROP TYPE "phi_access_type_enum"`);
  }
}
