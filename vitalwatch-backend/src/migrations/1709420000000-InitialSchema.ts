import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709420000000 implements MigrationInterface {
  name = 'InitialSchema1709420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------
    // Enable uuid-ossp extension for UUID generation
    // -------------------------------------------------------
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // -------------------------------------------------------
    // Create ENUM types
    // -------------------------------------------------------

    // User enums
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('patient', 'provider', 'admin', 'superadmin')
    `);
    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM ('active', 'inactive', 'suspended', 'pending', 'rejected')
    `);
    await queryRunner.query(`
      CREATE TYPE "onboarding_step_enum" AS ENUM ('registered', 'email_verified', 'profile_completed', 'device_assigned', 'first_reading', 'completed')
    `);

    // Organization enums
    await queryRunner.query(`
      CREATE TYPE "organization_status_enum" AS ENUM ('active', 'suspended', 'trial', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "organization_type_enum" AS ENUM ('hospital', 'clinic', 'practice', 'home_health', 'other')
    `);

    // Vital reading enums
    await queryRunner.query(`
      CREATE TYPE "vital_type_enum" AS ENUM ('blood_pressure', 'blood_glucose', 'glucose', 'spo2', 'weight', 'heart_rate', 'temperature', 'respiratory_rate', 'ecg')
    `);
    await queryRunner.query(`
      CREATE TYPE "vital_status_enum" AS ENUM ('normal', 'warning', 'critical')
    `);

    // Alert enums
    await queryRunner.query(`
      CREATE TYPE "alert_severity_enum" AS ENUM ('info', 'low', 'medium', 'warning', 'high', 'critical')
    `);
    await queryRunner.query(`
      CREATE TYPE "alert_status_enum" AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed')
    `);
    await queryRunner.query(`
      CREATE TYPE "alert_type_enum" AS ENUM ('vital_threshold', 'vital_trend', 'vital_abnormal', 'device_offline', 'medication_missed', 'no_reading', 'ai_prediction', 'weight_change', 'custom')
    `);

    // Device enums
    await queryRunner.query(`
      CREATE TYPE "device_type_enum" AS ENUM ('blood_pressure_monitor', 'glucose_meter', 'pulse_oximeter', 'weight_scale', 'thermometer', 'ecg_monitor', 'activity_tracker')
    `);
    await queryRunner.query(`
      CREATE TYPE "device_status_enum" AS ENUM ('active', 'inactive', 'disconnected', 'maintenance', 'retired')
    `);
    await queryRunner.query(`
      CREATE TYPE "device_vendor_enum" AS ENUM ('tenovi', 'withings', 'omron', 'dexcom', 'abbott', 'other')
    `);

    // Medication enums
    await queryRunner.query(`
      CREATE TYPE "medication_status_enum" AS ENUM ('active', 'paused', 'completed', 'discontinued')
    `);
    await queryRunner.query(`
      CREATE TYPE "medication_frequency_enum" AS ENUM ('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_other_day', 'weekly', 'as_needed', 'custom')
    `);

    // Appointment enums
    await queryRunner.query(`
      CREATE TYPE "appointment_type_enum" AS ENUM ('in_person', 'telehealth', 'phone')
    `);
    await queryRunner.query(`
      CREATE TYPE "appointment_status_enum" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    `);

    // Billing enums
    await queryRunner.query(`
      CREATE TYPE "cpt_code_enum" AS ENUM ('99453', '99454', '99457', '99458')
    `);
    await queryRunner.query(`
      CREATE TYPE "billing_status_enum" AS ENUM ('pending', 'submitted', 'approved', 'denied', 'paid')
    `);

    // Subscription enums
    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'paused')
    `);
    await queryRunner.query(`
      CREATE TYPE "plan_type_enum" AS ENUM ('starter', 'pro', 'enterprise')
    `);

    // Invoice enums
    await queryRunner.query(`
      CREATE TYPE "invoice_status_enum" AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible', 'failed')
    `);

    // Notification enums
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM ('email', 'sms', 'push', 'in_app')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_category_enum" AS ENUM ('alert', 'reminder', 'system', 'billing', 'security', 'marketing')
    `);

    // Invite code enums
    await queryRunner.query(`
      CREATE TYPE "invite_code_status_enum" AS ENUM ('active', 'used', 'expired', 'revoked')
    `);

    // Clinical note enums
    await queryRunner.query(`
      CREATE TYPE "note_type_enum" AS ENUM ('progress', 'soap', 'encounter', 'phone_call', 'telehealth', 'care_coordination', 'medication_review', 'vital_review', 'alert_response', 'general')
    `);
    await queryRunner.query(`
      CREATE TYPE "note_status_enum" AS ENUM ('draft', 'signed', 'amended', 'locked')
    `);

    // Communication log enums
    await queryRunner.query(`
      CREATE TYPE "communication_type_enum" AS ENUM ('call', 'message', 'video', 'email', 'sms', 'alert')
    `);
    await queryRunner.query(`
      CREATE TYPE "communication_direction_enum" AS ENUM ('inbound', 'outbound')
    `);
    await queryRunner.query(`
      CREATE TYPE "communication_outcome_enum" AS ENUM ('completed', 'missed', 'voicemail', 'no_answer')
    `);

    // Consent enums
    await queryRunner.query(`
      CREATE TYPE "consent_type_enum" AS ENUM ('rpm_enrollment', 'telehealth', 'data_sharing', 'hipaa', 'treatment', 'billing', 'communication', 'research', 'general')
    `);
    await queryRunner.query(`
      CREATE TYPE "consent_status_enum" AS ENUM ('pending', 'signed', 'declined', 'expired', 'revoked')
    `);

    // Tenovi device enums
    await queryRunner.query(`
      CREATE TYPE "tenovi_device_status_enum" AS ENUM ('active', 'inactive', 'connected', 'disconnected', 'unlinked')
    `);
    await queryRunner.query(`
      CREATE TYPE "tenovi_shipping_status_enum" AS ENUM ('DR', 'RQ', 'PE', 'CR', 'OH', 'RS', 'SH', 'DE', 'RE', 'CA')
    `);
    await queryRunner.query(`
      CREATE TYPE "whitelist_status_enum" AS ENUM ('RE', 'CO', 'PE', 'RM')
    `);

    // Report enums
    await queryRunner.query(`
      CREATE TYPE "report_type_enum" AS ENUM ('patient_summary', 'vitals_history', 'billing', 'compliance', 'population_health', 'custom')
    `);
    await queryRunner.query(`
      CREATE TYPE "report_status_enum" AS ENUM ('pending', 'generating', 'completed', 'failed')
    `);

    // -------------------------------------------------------
    // Create tables
    // -------------------------------------------------------

    // 1. organizations (no FK dependencies)
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "organization_type_enum" NOT NULL DEFAULT 'clinic',
        "status" "organization_status_enum" NOT NULL DEFAULT 'trial',
        "address" character varying,
        "city" character varying,
        "state" character varying,
        "zipCode" character varying,
        "country" character varying,
        "phone" character varying,
        "email" character varying,
        "website" character varying,
        "taxId" character varying,
        "npi" character varying,
        "logo" character varying,
        "settings" jsonb,
        "stripeCustomerId" character varying,
        "subscriptionPlan" character varying,
        "trialEndsAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    // 2. users (depends on organizations)
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "phone" character varying,
        "avatar" character varying,
        "role" "user_role_enum" NOT NULL DEFAULT 'patient',
        "status" "user_status_enum" NOT NULL DEFAULT 'pending',
        "emailVerified" boolean NOT NULL DEFAULT false,
        "phoneVerified" boolean NOT NULL DEFAULT false,
        "mfaEnabled" boolean NOT NULL DEFAULT false,
        "mfaSecret" character varying,
        "organizationId" character varying,
        "npi" character varying,
        "specialty" character varying,
        "credentials" text,
        "licenseStates" text,
        "dateOfBirth" date,
        "conditions" text,
        "providerId" character varying,
        "googleId" character varying,
        "microsoftId" character varying,
        "appleId" character varying,
        "lastLoginAt" TIMESTAMP,
        "lastLoginIp" character varying,
        "passwordChangedAt" TIMESTAMP,
        "verificationToken" character varying,
        "resetToken" character varying,
        "resetTokenExpiresAt" TIMESTAMP,
        "assignedProviderId" character varying,
        "onboardingStep" "onboarding_step_enum",
        "notificationPreferences" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // 3. vital_readings
    await queryRunner.query(`
      CREATE TABLE "vital_readings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" uuid NOT NULL,
        "deviceId" uuid,
        "providerId" uuid,
        "type" "vital_type_enum" NOT NULL,
        "values" jsonb NOT NULL,
        "value" float,
        "systolic" float,
        "diastolic" float,
        "unit" character varying NOT NULL,
        "status" "vital_status_enum" NOT NULL DEFAULT 'normal',
        "recordedAt" TIMESTAMP NOT NULL,
        "mealContext" character varying,
        "notes" character varying,
        "deviceSerial" character varying,
        "deviceModel" character varying,
        "firmwareVersion" character varying,
        "batteryLevel" integer,
        "aiProcessed" boolean NOT NULL DEFAULT false,
        "aiAnalysis" jsonb,
        "alertGenerated" boolean NOT NULL DEFAULT false,
        "alertId" uuid,
        "rawData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vital_readings" PRIMARY KEY ("id")
      )
    `);

    // 4. alerts
    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" uuid NOT NULL,
        "providerId" uuid NOT NULL,
        "organizationId" uuid,
        "type" "alert_type_enum" NOT NULL,
        "severity" "alert_severity_enum" NOT NULL DEFAULT 'warning',
        "status" "alert_status_enum" NOT NULL DEFAULT 'active',
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "vitalReadingId" uuid,
        "triggerData" jsonb,
        "aiRecommendation" text,
        "aiConfidence" float,
        "acknowledgedAt" TIMESTAMP,
        "acknowledgedBy" uuid,
        "resolvedAt" TIMESTAMP,
        "resolvedBy" uuid,
        "resolution" text,
        "notes" text,
        "pushSent" boolean NOT NULL DEFAULT false,
        "smsSent" boolean NOT NULL DEFAULT false,
        "emailSent" boolean NOT NULL DEFAULT false,
        "lastNotificationAt" TIMESTAMP,
        "escalationLevel" integer NOT NULL DEFAULT 0,
        "nextEscalationAt" TIMESTAMP,
        "escalatedAt" TIMESTAMP,
        "notificationSent" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alerts" PRIMARY KEY ("id")
      )
    `);

    // 5. devices
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "organizationId" character varying,
        "type" "device_type_enum" NOT NULL,
        "vendor" "device_vendor_enum" NOT NULL DEFAULT 'tenovi',
        "status" "device_status_enum" NOT NULL DEFAULT 'inactive',
        "name" character varying NOT NULL,
        "model" character varying,
        "serialNumber" character varying NOT NULL,
        "tenoviDeviceId" character varying,
        "firmwareVersion" character varying,
        "lastSyncAt" TIMESTAMP,
        "lastReadingAt" TIMESTAMP,
        "totalReadings" integer NOT NULL DEFAULT 0,
        "batteryLevel" decimal(5,2),
        "settings" jsonb,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_devices_serialNumber" UNIQUE ("serialNumber"),
        CONSTRAINT "PK_devices" PRIMARY KEY ("id")
      )
    `);

    // 6. medications
    await queryRunner.query(`
      CREATE TABLE "medications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "dosage" character varying NOT NULL,
        "frequency" "medication_frequency_enum" NOT NULL DEFAULT 'once_daily',
        "schedule" jsonb,
        "status" "medication_status_enum" NOT NULL DEFAULT 'active',
        "prescribedBy" character varying,
        "startDate" date,
        "endDate" date,
        "refillDate" date,
        "refillsRemaining" integer NOT NULL DEFAULT 0,
        "instructions" text,
        "notes" text,
        "sideEffects" jsonb,
        "interactions" jsonb,
        "pharmacy" character varying,
        "rxNumber" character varying,
        "organizationId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_medications" PRIMARY KEY ("id")
      )
    `);

    // 7. medication_logs
    await queryRunner.query(`
      CREATE TABLE "medication_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "medicationId" character varying NOT NULL,
        "patientId" character varying NOT NULL,
        "scheduledAt" TIMESTAMP NOT NULL,
        "takenAt" TIMESTAMP,
        "taken" boolean NOT NULL DEFAULT false,
        "skipped" boolean NOT NULL DEFAULT false,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medication_logs" PRIMARY KEY ("id")
      )
    `);

    // 8. appointments
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "providerId" character varying NOT NULL,
        "type" "appointment_type_enum" NOT NULL DEFAULT 'telehealth',
        "status" "appointment_status_enum" NOT NULL DEFAULT 'scheduled',
        "title" character varying NOT NULL,
        "description" text,
        "scheduledAt" TIMESTAMP NOT NULL,
        "durationMinutes" integer NOT NULL DEFAULT 30,
        "location" character varying,
        "telehealthUrl" character varying,
        "notes" text,
        "cancelledBy" character varying,
        "cancellationReason" text,
        "organizationId" character varying,
        "reminders" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments" PRIMARY KEY ("id")
      )
    `);

    // 9. billing_records
    await queryRunner.query(`
      CREATE TABLE "billing_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "providerId" character varying NOT NULL,
        "organizationId" character varying,
        "cptCode" "cpt_code_enum" NOT NULL,
        "status" "billing_status_enum" NOT NULL DEFAULT 'pending',
        "serviceDate" date NOT NULL,
        "billingPeriodStart" date NOT NULL,
        "billingPeriodEnd" date NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "minutesSpent" integer NOT NULL DEFAULT 0,
        "daysWithReadings" integer NOT NULL DEFAULT 0,
        "notes" text,
        "supportingData" jsonb,
        "claimNumber" character varying,
        "submittedAt" TIMESTAMP,
        "processedAt" TIMESTAMP,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_records" PRIMARY KEY ("id")
      )
    `);

    // 10. subscriptions
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying,
        "userId" character varying,
        "plan" "plan_type_enum" NOT NULL,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'incomplete',
        "stripeCustomerId" character varying,
        "stripeSubscriptionId" character varying,
        "stripePriceId" character varying,
        "monthlyPrice" decimal(10,2) NOT NULL,
        "patientLimit" integer NOT NULL DEFAULT 0,
        "providerLimit" integer NOT NULL DEFAULT 0,
        "currentPeriodStart" TIMESTAMP,
        "currentPeriodEnd" TIMESTAMP,
        "trialEnd" TIMESTAMP,
        "canceledAt" TIMESTAMP,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_stripeSubscriptionId" UNIQUE ("stripeSubscriptionId"),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id")
      )
    `);

    // 11. invoices
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying,
        "userId" character varying,
        "status" "invoice_status_enum" NOT NULL DEFAULT 'draft',
        "stripeInvoiceId" character varying,
        "stripePaymentIntentId" character varying,
        "subtotal" decimal(10,2) NOT NULL,
        "tax" decimal(10,2) NOT NULL DEFAULT 0,
        "total" decimal(10,2) NOT NULL,
        "currency" character varying,
        "periodStart" TIMESTAMP,
        "periodEnd" TIMESTAMP,
        "dueDate" TIMESTAMP,
        "paidAt" TIMESTAMP,
        "invoicePdfUrl" character varying,
        "hostedInvoiceUrl" character varying,
        "lineItems" jsonb,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invoices_stripeInvoiceId" UNIQUE ("stripeInvoiceId"),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
      )
    `);

    // 12. message_threads
    await queryRunner.query(`
      CREATE TABLE "message_threads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject" character varying,
        "createdById" character varying,
        "lastMessageId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_message_threads" PRIMARY KEY ("id")
      )
    `);

    // 13. messages
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "threadId" character varying NOT NULL,
        "senderId" character varying NOT NULL,
        "content" text NOT NULL,
        "attachments" jsonb,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_messages" PRIMARY KEY ("id")
      )
    `);

    // 14. message_thread_participants (join table)
    await queryRunner.query(`
      CREATE TABLE "message_thread_participants" (
        "threadId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_message_thread_participants" PRIMARY KEY ("threadId", "userId")
      )
    `);

    // 15. notifications
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "notification_type_enum" NOT NULL,
        "category" "notification_category_enum" NOT NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "userId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "data" jsonb,
        "recipient" character varying,
        "externalId" character varying,
        "errorMessage" character varying,
        "sentAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "readAt" TIMESTAMP,
        "retryCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // 16. audit_logs
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" character varying(100) NOT NULL,
        "userId" character varying,
        "resourceType" character varying,
        "resourceId" character varying,
        "details" jsonb,
        "ipAddress" character varying,
        "userAgent" character varying,
        "organizationId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // 17. invite_codes
    await queryRunner.query(`
      CREATE TABLE "invite_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "allowedRole" "user_role_enum" NOT NULL DEFAULT 'provider',
        "status" "invite_code_status_enum" NOT NULL DEFAULT 'active',
        "organizationId" character varying,
        "createdById" character varying,
        "usedById" character varying,
        "usedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "maxUses" integer NOT NULL DEFAULT 1,
        "usesCount" integer NOT NULL DEFAULT 0,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invite_codes_code" UNIQUE ("code"),
        CONSTRAINT "PK_invite_codes" PRIMARY KEY ("id")
      )
    `);

    // 18. clinical_notes
    await queryRunner.query(`
      CREATE TABLE "clinical_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "providerId" character varying NOT NULL,
        "type" "note_type_enum" NOT NULL DEFAULT 'progress',
        "status" "note_status_enum" NOT NULL DEFAULT 'draft',
        "title" character varying NOT NULL,
        "content" text NOT NULL,
        "soapContent" jsonb,
        "timeTracking" jsonb,
        "vitalReadingIds" jsonb,
        "alertIds" jsonb,
        "attachments" jsonb,
        "tags" jsonb,
        "signedAt" TIMESTAMP,
        "signedBy" character varying,
        "amendedFrom" character varying,
        "amendmentReason" text,
        "organizationId" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clinical_notes" PRIMARY KEY ("id")
      )
    `);

    // 19. communication_logs
    await queryRunner.query(`
      CREATE TABLE "communication_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "providerId" character varying NOT NULL,
        "type" "communication_type_enum" NOT NULL,
        "direction" "communication_direction_enum" NOT NULL,
        "summary" text,
        "durationMinutes" integer NOT NULL DEFAULT 0,
        "outcome" "communication_outcome_enum" NOT NULL DEFAULT 'completed',
        "relatedNoteId" character varying,
        "organizationId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_communication_logs" PRIMARY KEY ("id")
      )
    `);

    // 20. consent_templates
    await queryRunner.query(`
      CREATE TABLE "consent_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "consent_type_enum" NOT NULL,
        "version" character varying NOT NULL,
        "content" text NOT NULL,
        "summary" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "requiresWitness" boolean NOT NULL DEFAULT false,
        "requiresGuardian" boolean NOT NULL DEFAULT false,
        "expirationDays" integer,
        "organizationId" character varying,
        "requiredFields" jsonb,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consent_templates" PRIMARY KEY ("id")
      )
    `);

    // 21. patient_consents
    await queryRunner.query(`
      CREATE TABLE "patient_consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" character varying NOT NULL,
        "templateId" character varying NOT NULL,
        "type" "consent_type_enum" NOT NULL,
        "status" "consent_status_enum" NOT NULL DEFAULT 'pending',
        "version" character varying NOT NULL,
        "consentContent" text NOT NULL,
        "signedAt" TIMESTAMP,
        "signatureData" character varying,
        "signatureIp" character varying,
        "signatureUserAgent" character varying,
        "witnessId" character varying,
        "witnessSignedAt" TIMESTAMP,
        "guardianName" character varying,
        "guardianRelationship" character varying,
        "guardianSignature" character varying,
        "expiresAt" date,
        "revokedAt" TIMESTAMP,
        "revokedBy" character varying,
        "revocationReason" text,
        "organizationId" character varying,
        "customFields" jsonb,
        "metadata" jsonb,
        "lastReminderSentAt" TIMESTAMP,
        "reminderCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_consents" PRIMARY KEY ("id")
      )
    `);

    // 22. tenovi_hwi_devices
    await queryRunner.query(`
      CREATE TABLE "tenovi_hwi_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hwi_device_id" character varying NOT NULL,
        "tenovi_id" character varying,
        "status" "tenovi_device_status_enum" NOT NULL DEFAULT 'inactive',
        "connected_on" TIMESTAMP,
        "unlinked_on" TIMESTAMP,
        "last_measurement" TIMESTAMP,
        "device_name" character varying,
        "hardware_uuid" character varying,
        "sensor_code" character varying,
        "sensor_id" character varying,
        "device_type_id" character varying,
        "model_number" character varying,
        "shared_hardware_uuid" boolean NOT NULL DEFAULT false,
        "fulfillment_created" TIMESTAMP,
        "shipping_status" "tenovi_shipping_status_enum",
        "shipping_name" character varying,
        "shipping_address" character varying,
        "shipping_city" character varying,
        "shipping_state" character varying,
        "shipping_zip_code" character varying,
        "shipping_tracking_link" character varying,
        "shipped_on" TIMESTAMP,
        "delivered_on" TIMESTAMP,
        "fulfilled" boolean NOT NULL DEFAULT false,
        "tenovi_patient_id" character varying,
        "patient_phone_number" character varying,
        "patientId" character varying,
        "organizationId" character varying,
        "patient_external_id" character varying,
        "patient_name" character varying,
        "patient_email" character varying,
        "physician" character varying,
        "clinic_name" character varying,
        "care_manager" character varying,
        "sms_opt_in" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "fulfillment_metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenovi_hwi_devices_hwi_device_id" UNIQUE ("hwi_device_id"),
        CONSTRAINT "PK_tenovi_hwi_devices" PRIMARY KEY ("id")
      )
    `);

    // 23. tenovi_gateways
    await queryRunner.query(`
      CREATE TABLE "tenovi_gateways" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gateway_uuid" character varying NOT NULL,
        "firmware_version" character varying,
        "bootloader_version" character varying,
        "provisioned" boolean NOT NULL DEFAULT false,
        "last_signal_strength" integer,
        "last_checkin_time" TIMESTAMP,
        "assigned_on" TIMESTAMP,
        "shipped_on" TIMESTAMP,
        "organizationId" character varying,
        "patientId" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenovi_gateways_gateway_uuid" UNIQUE ("gateway_uuid"),
        CONSTRAINT "PK_tenovi_gateways" PRIMARY KEY ("id")
      )
    `);

    // 24. tenovi_whitelisted_devices
    await queryRunner.query(`
      CREATE TABLE "tenovi_whitelisted_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gatewayId" character varying NOT NULL,
        "sensor_code" character varying NOT NULL,
        "mac_address" character varying NOT NULL,
        "whitelist_status" "whitelist_status_enum" NOT NULL DEFAULT 'PE',
        "created" TIMESTAMP NOT NULL DEFAULT now(),
        "modified" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenovi_whitelisted_devices" PRIMARY KEY ("id")
      )
    `);

    // 25. tenovi_gateway_properties
    await queryRunner.query(`
      CREATE TABLE "tenovi_gateway_properties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gatewayId" character varying NOT NULL,
        "key" character varying NOT NULL,
        "value" text,
        CONSTRAINT "PK_tenovi_gateway_properties" PRIMARY KEY ("id")
      )
    `);

    // 26. api_keys
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "keyHash" character varying NOT NULL,
        "keyPrefix" character varying NOT NULL,
        "scopes" text,
        "organizationId" character varying,
        "createdById" character varying NOT NULL,
        "rateLimit" integer NOT NULL DEFAULT 1000,
        "expiresAt" TIMESTAMP,
        "lastUsedAt" TIMESTAMP,
        "usageCount" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      )
    `);

    // 27. reports
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "report_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "status" "report_status_enum" NOT NULL DEFAULT 'pending',
        "organizationId" character varying,
        "patientId" character varying,
        "createdById" character varying NOT NULL,
        "parameters" jsonb,
        "format" character varying NOT NULL DEFAULT 'pdf',
        "fileUrl" character varying,
        "fileSize" bigint,
        "completedAt" TIMESTAMP,
        "error" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_reports" PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------
    // Create indexes
    // -------------------------------------------------------

    // vital_readings indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_vital_readings_patientId" ON "vital_readings" ("patientId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_vital_readings_type" ON "vital_readings" ("type")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_vital_readings_recordedAt" ON "vital_readings" ("recordedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vital_readings_patientId_type_recordedAt" ON "vital_readings" ("patientId", "type", "recordedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vital_readings_patientId_recordedAt" ON "vital_readings" ("patientId", "recordedAt")`,
    );

    // alerts indexes
    await queryRunner.query(`CREATE INDEX "IDX_alerts_patientId" ON "alerts" ("patientId")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_providerId" ON "alerts" ("providerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_severity" ON "alerts" ("severity")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_status" ON "alerts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_createdAt" ON "alerts" ("createdAt")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_patientId_status" ON "alerts" ("patientId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_providerId_status" ON "alerts" ("providerId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerts_severity_status" ON "alerts" ("severity", "status")`,
    );

    // devices indexes
    await queryRunner.query(`CREATE INDEX "IDX_devices_patientId" ON "devices" ("patientId")`);
    await queryRunner.query(`CREATE INDEX "IDX_devices_status" ON "devices" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_devices_patientId_status" ON "devices" ("patientId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_devices_tenoviDeviceId" ON "devices" ("tenoviDeviceId")`,
    );

    // medications indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_medications_patientId" ON "medications" ("patientId")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_medications_status" ON "medications" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_medications_patientId_status" ON "medications" ("patientId", "status")`,
    );

    // billing_records indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_billing_records_patientId" ON "billing_records" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_billing_records_cptCode" ON "billing_records" ("cptCode")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_billing_records_billingPeriodStart" ON "billing_records" ("billingPeriodStart")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_billing_records_patientId_serviceDate" ON "billing_records" ("patientId", "serviceDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_billing_records_providerId_status" ON "billing_records" ("providerId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_billing_records_cptCode_serviceDate" ON "billing_records" ("cptCode", "serviceDate")`,
    );

    // subscriptions indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_organizationId_status" ON "subscriptions" ("organizationId", "status")`,
    );

    // invoices indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_organizationId_status" ON "invoices" ("organizationId", "status")`,
    );

    // notifications indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_userId_status_createdAt" ON "notifications" ("userId", "status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_type_status" ON "notifications" ("type", "status")`,
    );

    // audit_logs indexes
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_userId_createdAt" ON "audit_logs" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action_createdAt" ON "audit_logs" ("action", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resourceType_resourceId" ON "audit_logs" ("resourceType", "resourceId")`,
    );

    // clinical_notes indexes
    await queryRunner.query(`CREATE INDEX "IDX_clinical_notes_type" ON "clinical_notes" ("type")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_clinical_notes_status" ON "clinical_notes" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clinical_notes_patientId_createdAt" ON "clinical_notes" ("patientId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clinical_notes_providerId_createdAt" ON "clinical_notes" ("providerId", "createdAt")`,
    );

    // communication_logs indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_logs_patientId_createdAt" ON "communication_logs" ("patientId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_communication_logs_providerId_createdAt" ON "communication_logs" ("providerId", "createdAt")`,
    );

    // consent_templates indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_consent_templates_type" ON "consent_templates" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_consent_templates_organizationId" ON "consent_templates" ("organizationId")`,
    );

    // patient_consents indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_consents_patientId_type" ON "patient_consents" ("patientId", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_consents_patientId_status" ON "patient_consents" ("patientId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_consents_organizationId" ON "patient_consents" ("organizationId")`,
    );

    // tenovi_hwi_devices indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_tenovi_hwi_devices_patientId" ON "tenovi_hwi_devices" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenovi_hwi_devices_organizationId" ON "tenovi_hwi_devices" ("organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenovi_hwi_devices_hardware_uuid" ON "tenovi_hwi_devices" ("hardware_uuid")`,
    );

    // tenovi_gateways indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_tenovi_gateways_organizationId" ON "tenovi_gateways" ("organizationId")`,
    );

    // tenovi_whitelisted_devices indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tenovi_whitelisted_devices_gatewayId_macAddress" ON "tenovi_whitelisted_devices" ("gatewayId", "mac_address")`,
    );

    // message_thread_participants indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_message_thread_participants_threadId" ON "message_thread_participants" ("threadId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_thread_participants_userId" ON "message_thread_participants" ("userId")`,
    );

    // -------------------------------------------------------
    // Create foreign keys
    // -------------------------------------------------------

    // devices -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "devices"
      ADD CONSTRAINT "FK_devices_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // medications -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "medications"
      ADD CONSTRAINT "FK_medications_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // medications -> users (prescribedBy)
    await queryRunner.query(`
      ALTER TABLE "medications"
      ADD CONSTRAINT "FK_medications_prescribedBy"
      FOREIGN KEY ("prescribedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // appointments -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "FK_appointments_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // appointments -> users (providerId)
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "FK_appointments_providerId"
      FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // billing_records -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "billing_records"
      ADD CONSTRAINT "FK_billing_records_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // billing_records -> users (providerId)
    await queryRunner.query(`
      ALTER TABLE "billing_records"
      ADD CONSTRAINT "FK_billing_records_providerId"
      FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // subscriptions -> users (userId)
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD CONSTRAINT "FK_subscriptions_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // invoices -> users (userId)
    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "FK_invoices_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // message_threads -> users (createdById)
    await queryRunner.query(`
      ALTER TABLE "message_threads"
      ADD CONSTRAINT "FK_message_threads_createdById"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // messages -> message_threads (threadId)
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD CONSTRAINT "FK_messages_threadId"
      FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // messages -> users (senderId)
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD CONSTRAINT "FK_messages_senderId"
      FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // message_thread_participants -> message_threads
    await queryRunner.query(`
      ALTER TABLE "message_thread_participants"
      ADD CONSTRAINT "FK_message_thread_participants_threadId"
      FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // message_thread_participants -> users
    await queryRunner.query(`
      ALTER TABLE "message_thread_participants"
      ADD CONSTRAINT "FK_message_thread_participants_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // notifications -> users (userId)
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // audit_logs -> users (userId)
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD CONSTRAINT "FK_audit_logs_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // invite_codes -> users (createdById)
    await queryRunner.query(`
      ALTER TABLE "invite_codes"
      ADD CONSTRAINT "FK_invite_codes_createdById"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // invite_codes -> users (usedById)
    await queryRunner.query(`
      ALTER TABLE "invite_codes"
      ADD CONSTRAINT "FK_invite_codes_usedById"
      FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // clinical_notes -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "clinical_notes"
      ADD CONSTRAINT "FK_clinical_notes_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // clinical_notes -> users (providerId)
    await queryRunner.query(`
      ALTER TABLE "clinical_notes"
      ADD CONSTRAINT "FK_clinical_notes_providerId"
      FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // clinical_notes -> users (signedBy)
    await queryRunner.query(`
      ALTER TABLE "clinical_notes"
      ADD CONSTRAINT "FK_clinical_notes_signedBy"
      FOREIGN KEY ("signedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // communication_logs -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "communication_logs"
      ADD CONSTRAINT "FK_communication_logs_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // communication_logs -> users (providerId)
    await queryRunner.query(`
      ALTER TABLE "communication_logs"
      ADD CONSTRAINT "FK_communication_logs_providerId"
      FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // communication_logs -> clinical_notes (relatedNoteId)
    await queryRunner.query(`
      ALTER TABLE "communication_logs"
      ADD CONSTRAINT "FK_communication_logs_relatedNoteId"
      FOREIGN KEY ("relatedNoteId") REFERENCES "clinical_notes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // patient_consents -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "patient_consents"
      ADD CONSTRAINT "FK_patient_consents_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // patient_consents -> consent_templates (templateId)
    await queryRunner.query(`
      ALTER TABLE "patient_consents"
      ADD CONSTRAINT "FK_patient_consents_templateId"
      FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // patient_consents -> users (witnessId)
    await queryRunner.query(`
      ALTER TABLE "patient_consents"
      ADD CONSTRAINT "FK_patient_consents_witnessId"
      FOREIGN KEY ("witnessId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // tenovi_hwi_devices -> users (patientId)
    await queryRunner.query(`
      ALTER TABLE "tenovi_hwi_devices"
      ADD CONSTRAINT "FK_tenovi_hwi_devices_patientId"
      FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // tenovi_hwi_devices -> organizations (organizationId)
    await queryRunner.query(`
      ALTER TABLE "tenovi_hwi_devices"
      ADD CONSTRAINT "FK_tenovi_hwi_devices_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // tenovi_gateways -> organizations (organizationId)
    await queryRunner.query(`
      ALTER TABLE "tenovi_gateways"
      ADD CONSTRAINT "FK_tenovi_gateways_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // api_keys -> users (createdById)
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      ADD CONSTRAINT "FK_api_keys_createdById"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // reports -> users (createdById)
    await queryRunner.query(`
      ALTER TABLE "reports"
      ADD CONSTRAINT "FK_reports_createdById"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // medication_logs -> medications (medicationId)
    await queryRunner.query(`
      ALTER TABLE "medication_logs"
      ADD CONSTRAINT "FK_medication_logs_medicationId"
      FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------
    // Drop foreign keys first
    // -------------------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "medication_logs" DROP CONSTRAINT IF EXISTS "FK_medication_logs_medicationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "FK_reports_createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "FK_api_keys_createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenovi_gateways" DROP CONSTRAINT IF EXISTS "FK_tenovi_gateways_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenovi_hwi_devices" DROP CONSTRAINT IF EXISTS "FK_tenovi_hwi_devices_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenovi_hwi_devices" DROP CONSTRAINT IF EXISTS "FK_tenovi_hwi_devices_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_consents" DROP CONSTRAINT IF EXISTS "FK_patient_consents_witnessId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_consents" DROP CONSTRAINT IF EXISTS "FK_patient_consents_templateId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_consents" DROP CONSTRAINT IF EXISTS "FK_patient_consents_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_logs" DROP CONSTRAINT IF EXISTS "FK_communication_logs_relatedNoteId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_logs" DROP CONSTRAINT IF EXISTS "FK_communication_logs_providerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication_logs" DROP CONSTRAINT IF EXISTS "FK_communication_logs_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_notes" DROP CONSTRAINT IF EXISTS "FK_clinical_notes_signedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_notes" DROP CONSTRAINT IF EXISTS "FK_clinical_notes_providerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_notes" DROP CONSTRAINT IF EXISTS "FK_clinical_notes_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_codes" DROP CONSTRAINT IF EXISTS "FK_invite_codes_usedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_codes" DROP CONSTRAINT IF EXISTS "FK_invite_codes_createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_audit_logs_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_thread_participants" DROP CONSTRAINT IF EXISTS "FK_message_thread_participants_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_thread_participants" DROP CONSTRAINT IF EXISTS "FK_message_thread_participants_threadId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_senderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_threadId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_threads" DROP CONSTRAINT IF EXISTS "FK_message_threads_createdById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_invoices_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscriptions_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_records" DROP CONSTRAINT IF EXISTS "FK_billing_records_providerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_records" DROP CONSTRAINT IF EXISTS "FK_billing_records_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_providerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medications" DROP CONSTRAINT IF EXISTS "FK_medications_prescribedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medications" DROP CONSTRAINT IF EXISTS "FK_medications_patientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "FK_devices_patientId"`,
    );

    // -------------------------------------------------------
    // Drop tables in reverse order
    // -------------------------------------------------------
    await queryRunner.query(`DROP TABLE IF EXISTS "reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenovi_gateway_properties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenovi_whitelisted_devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenovi_gateways"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenovi_hwi_devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_consents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consent_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "communication_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_notes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invite_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_thread_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_threads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medication_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vital_readings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);

    // -------------------------------------------------------
    // Drop ENUM types
    // -------------------------------------------------------
    await queryRunner.query(`DROP TYPE IF EXISTS "report_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "whitelist_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenovi_shipping_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenovi_device_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consent_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consent_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "communication_outcome_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "communication_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "communication_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "note_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "note_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invite_code_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "plan_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cpt_code_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medication_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medication_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_vendor_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vital_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vital_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organization_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organization_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "onboarding_step_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
