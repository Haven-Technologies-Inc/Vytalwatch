-- Fix patient_consents table: 1591 pg_attributes from TypeORM sync cycles
-- Recreate table to clear phantom dropped columns

BEGIN;

-- 1. Create temp table with same structure and data
CREATE TABLE patient_consents_new (LIKE patient_consents INCLUDING ALL);
INSERT INTO patient_consents_new SELECT * FROM patient_consents;

-- 2. Drop old table
DROP TABLE patient_consents CASCADE;

-- 3. Rename new table
ALTER TABLE patient_consents_new RENAME TO patient_consents;

COMMIT;
