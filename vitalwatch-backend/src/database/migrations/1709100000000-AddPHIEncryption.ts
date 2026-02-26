import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPHIEncryption1709100000000 implements MigrationInterface {
  name = 'AddPHIEncryption1709100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User entity - change dateOfBirth from date to varchar for encrypted storage
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "dateOfBirth" TYPE varchar USING "dateOfBirth"::varchar`,
    );

    // VitalReading entity - change jsonb columns to text for encrypted storage
    await queryRunner.query(
      `ALTER TABLE "vital_readings" ALTER COLUMN "values" TYPE text USING "values"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "vital_readings" ALTER COLUMN "rawData" TYPE text USING "rawData"::text`,
    );

    // ClinicalNote entity - change jsonb to text for encrypted storage
    await queryRunner.query(
      `ALTER TABLE "clinical_notes" ALTER COLUMN "soapContent" TYPE text USING "soapContent"::text`,
    );

    // Claim entity - change jsonb columns to text for encrypted storage
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "codes" TYPE text USING "codes"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "readinessChecks" TYPE text USING "readinessChecks"::text`,
    );

    // Add comment to indicate PHI columns
    await queryRunner.query(`COMMENT ON COLUMN "users"."phone" IS 'PHI - AES-256-GCM encrypted'`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."dateOfBirth" IS 'PHI - AES-256-GCM encrypted'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."mfaSecret" IS 'PHI - AES-256-GCM encrypted'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "vital_readings"."values" IS 'PHI - AES-256-GCM encrypted biodata'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "vital_readings"."notes" IS 'PHI - AES-256-GCM encrypted'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "vital_readings"."rawData" IS 'PHI - AES-256-GCM encrypted biodata'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "clinical_notes"."content" IS 'PHI - AES-256-GCM encrypted clinical content'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "clinical_notes"."soapContent" IS 'PHI - AES-256-GCM encrypted SOAP notes'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "claims"."patientName" IS 'PHI - AES-256-GCM encrypted'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "claims"."codes" IS 'PHI - AES-256-GCM encrypted diagnosis codes'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert column types (note: data will be encrypted, manual decryption needed)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "dateOfBirth" TYPE date USING NULL`);
    await queryRunner.query(
      `ALTER TABLE "vital_readings" ALTER COLUMN "values" TYPE jsonb USING '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "vital_readings" ALTER COLUMN "rawData" TYPE jsonb USING NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clinical_notes" ALTER COLUMN "soapContent" TYPE jsonb USING NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "codes" TYPE jsonb USING '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "readinessChecks" TYPE jsonb USING '{}'::jsonb`,
    );

    // Remove comments
    await queryRunner.query(`COMMENT ON COLUMN "users"."phone" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "users"."dateOfBirth" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "users"."mfaSecret" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "vital_readings"."values" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "vital_readings"."notes" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "vital_readings"."rawData" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "clinical_notes"."content" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "clinical_notes"."soapContent" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "claims"."patientName" IS NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "claims"."codes" IS NULL`);
  }
}
