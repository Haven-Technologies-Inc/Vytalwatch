import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPHIEncryption1709100000000 implements MigrationInterface {
  name = 'AddPHIEncryption1709100000000';

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const r = await qr.query(`SELECT to_regclass('"${table}"') AS c`);
    return r[0]?.c !== null;
  }

  private async columnExists(qr: QueryRunner, table: string, col: string): Promise<boolean> {
    const r = await qr.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${col}' LIMIT 1`,
    );
    return r.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User entity - change dateOfBirth from date to varchar for encrypted storage
    if (await this.columnExists(queryRunner, 'users', 'dateOfBirth')) {
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "dateOfBirth" TYPE varchar USING "dateOfBirth"::varchar`,
      );
    }

    // VitalReading entity - change jsonb columns to text for encrypted storage
    if (await this.columnExists(queryRunner, 'vital_readings', 'values')) {
      await queryRunner.query(
        `ALTER TABLE "vital_readings" ALTER COLUMN "values" TYPE text USING "values"::text`,
      );
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'rawData')) {
      await queryRunner.query(
        `ALTER TABLE "vital_readings" ALTER COLUMN "rawData" TYPE text USING "rawData"::text`,
      );
    }

    // ClinicalNote entity - change jsonb to text for encrypted storage
    if (await this.columnExists(queryRunner, 'clinical_notes', 'soapContent')) {
      await queryRunner.query(
        `ALTER TABLE "clinical_notes" ALTER COLUMN "soapContent" TYPE text USING "soapContent"::text`,
      );
    }

    // Claim entity - change jsonb columns to text for encrypted storage (skip if table doesn't exist yet)
    if (await this.columnExists(queryRunner, 'claims', 'codes')) {
      await queryRunner.query(
        `ALTER TABLE "claims" ALTER COLUMN "codes" TYPE text USING "codes"::text`,
      );
    }
    if (await this.columnExists(queryRunner, 'claims', 'readinessChecks')) {
      await queryRunner.query(
        `ALTER TABLE "claims" ALTER COLUMN "readinessChecks" TYPE text USING "readinessChecks"::text`,
      );
    }

    // Add comment to indicate PHI columns
    if (await this.columnExists(queryRunner, 'users', 'phone')) {
      await queryRunner.query(`COMMENT ON COLUMN "users"."phone" IS 'PHI - AES-256-GCM encrypted'`);
    }
    if (await this.columnExists(queryRunner, 'users', 'dateOfBirth')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."dateOfBirth" IS 'PHI - AES-256-GCM encrypted'`,
      );
    }
    if (await this.columnExists(queryRunner, 'users', 'mfaSecret')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "users"."mfaSecret" IS 'PHI - AES-256-GCM encrypted'`,
      );
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'values')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "vital_readings"."values" IS 'PHI - AES-256-GCM encrypted biodata'`,
      );
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'notes')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "vital_readings"."notes" IS 'PHI - AES-256-GCM encrypted'`,
      );
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'rawData')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "vital_readings"."rawData" IS 'PHI - AES-256-GCM encrypted biodata'`,
      );
    }
    if (await this.columnExists(queryRunner, 'clinical_notes', 'content')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "clinical_notes"."content" IS 'PHI - AES-256-GCM encrypted clinical content'`,
      );
    }
    if (await this.columnExists(queryRunner, 'clinical_notes', 'soapContent')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "clinical_notes"."soapContent" IS 'PHI - AES-256-GCM encrypted SOAP notes'`,
      );
    }
    if (await this.columnExists(queryRunner, 'claims', 'patientName')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "claims"."patientName" IS 'PHI - AES-256-GCM encrypted'`,
      );
    }
    if (await this.columnExists(queryRunner, 'claims', 'codes')) {
      await queryRunner.query(
        `COMMENT ON COLUMN "claims"."codes" IS 'PHI - AES-256-GCM encrypted diagnosis codes'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'users', 'dateOfBirth')) {
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "dateOfBirth" TYPE date USING NULL`,
      );
      await queryRunner.query(`COMMENT ON COLUMN "users"."dateOfBirth" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'users', 'phone')) {
      await queryRunner.query(`COMMENT ON COLUMN "users"."phone" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'users', 'mfaSecret')) {
      await queryRunner.query(`COMMENT ON COLUMN "users"."mfaSecret" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'values')) {
      await queryRunner.query(
        `ALTER TABLE "vital_readings" ALTER COLUMN "values" TYPE jsonb USING '{}'::jsonb`,
      );
      await queryRunner.query(`COMMENT ON COLUMN "vital_readings"."values" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'rawData')) {
      await queryRunner.query(
        `ALTER TABLE "vital_readings" ALTER COLUMN "rawData" TYPE jsonb USING NULL`,
      );
      await queryRunner.query(`COMMENT ON COLUMN "vital_readings"."rawData" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'vital_readings', 'notes')) {
      await queryRunner.query(`COMMENT ON COLUMN "vital_readings"."notes" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'clinical_notes', 'soapContent')) {
      await queryRunner.query(
        `ALTER TABLE "clinical_notes" ALTER COLUMN "soapContent" TYPE jsonb USING NULL`,
      );
      await queryRunner.query(`COMMENT ON COLUMN "clinical_notes"."soapContent" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'clinical_notes', 'content')) {
      await queryRunner.query(`COMMENT ON COLUMN "clinical_notes"."content" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'claims', 'codes')) {
      await queryRunner.query(
        `ALTER TABLE "claims" ALTER COLUMN "codes" TYPE jsonb USING '[]'::jsonb`,
      );
      await queryRunner.query(`COMMENT ON COLUMN "claims"."codes" IS NULL`);
    }
    if (await this.columnExists(queryRunner, 'claims', 'readinessChecks')) {
      await queryRunner.query(
        `ALTER TABLE "claims" ALTER COLUMN "readinessChecks" TYPE jsonb USING '{}'::jsonb`,
      );
    }
    if (await this.columnExists(queryRunner, 'claims', 'patientName')) {
      await queryRunner.query(`COMMENT ON COLUMN "claims"."patientName" IS NULL`);
    }
  }
}
