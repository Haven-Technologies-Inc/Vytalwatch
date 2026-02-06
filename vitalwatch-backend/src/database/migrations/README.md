# VytalWatch Database Migrations

Complete TypeORM migration suite for all 11 VytalWatch modules with comprehensive tooling and production-ready features.

## Overview

This directory contains production-ready TypeORM migrations for:

1. **Tasks** - Care task management and assignment tracking
2. **Consents** - Patient consent records with digital signatures
3. **Claims** - Insurance billing and reimbursement tracking
4. **Medications** - Prescription management with adherence tracking (3 tables)
5. **Appointments** - Scheduling with telehealth support
6. **Messaging** - Encrypted patient-provider messaging (2 tables)
7. **Clinical Notes** - EHR documentation with SOAP notes
8. **WebRTC** - Video calling with recording (3 tables)
9. **Push Notifications** - Device token management
10. **AI Conversations** - AI-powered chat with token tracking (2 tables)
11. **Encryption Keys** - Encryption key management for HIPAA compliance

**Total: 21 database tables**

## Migration Files

### Core Migrations

| Migration | File | Tables Created |
|-----------|------|----------------|
| Tasks | `20260206120000-CreateTasks.ts` | tasks |
| Consents | `20260206120100-CreateConsents.ts` | consents |
| Claims | `20260206120200-CreateClaims.ts` | claims |
| Medications | `20260206120300-CreateMedications.ts` | medications, medication_schedules, medication_adherence |
| Appointments | `20260206120400-CreateAppointments.ts` | appointments |
| Messaging | `20260206120500-CreateMessaging.ts` | conversations, messages |
| Clinical Notes | `20260206120600-CreateClinicalNotes.ts` | clinical_notes |
| WebRTC | `20260206120700-CreateWebRTC.ts` | calls, call_participants, call_recordings |
| Push Notifications | `20260206120800-CreateDeviceTokens.ts` | device_tokens |
| AI Conversations | `20260206120900-CreateAIConversations.ts` | ai_conversations, ai_messages |
| Encryption | `20260206121000-CreateEncryptionKeys.ts` | encryption_keys |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `run-all-migrations.ts` | Master migration runner with logging |
| `verify-migrations.ts` | Verify schema integrity and completeness |
| `rollback-all.ts` | Safe migration rollback with confirmation |
| `seed-test-data.ts` | Generate realistic test data |

## Prerequisites

1. PostgreSQL database (v12 or higher)
2. TypeORM installed in your project
3. Required environment variables:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=vytalwatch
   ```

## Quick Start

### 1. Run All Migrations

```bash
# Using npm script (recommended)
npm run migration:run

# Or directly with ts-node
ts-node src/database/migrations/run-all-migrations.ts
```

**Output:**
```
================================================================================
VytalWatch Database Migration Runner
================================================================================

ℹ Database: vytalwatch
ℹ Host: localhost:5432
ℹ User: postgres
ℹ Connecting to database...
✓ Database connection established
✓ UUID extension verified

ℹ Running pending migrations...

--------------------------------------------------------------------------------
✓ Successfully executed 11 migration(s):
  1. CreateTasks20260206120000
  2. CreateConsents20260206120100
  3. CreateClaims20260206120200
  ...
--------------------------------------------------------------------------------

✓ Migration process completed in 2.34s
```

### 2. Verify Migrations

```bash
npm run migration:verify

# Or
ts-node src/database/migrations/verify-migrations.ts
```

This checks:
- ✓ All tables exist
- ✓ All indexes are created
- ✓ All foreign keys are in place
- ✓ Migration history is accurate

### 3. Seed Test Data

```bash
# Seed data for development/testing
npm run migration:seed

# Seed with cleanup first
npm run migration:seed -- --clean

# Seed with custom record count
npm run migration:seed -- --count 50
```

**Warning:** Never run this in production!

### 4. Rollback Migrations

```bash
# Rollback last migration
npm run migration:rollback

# Rollback last 3 migrations
npm run migration:rollback -- -n 3

# Rollback all migrations (requires confirmation)
npm run migration:rollback -- -all
```

## NPM Scripts Setup

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "migration:run": "ts-node src/database/migrations/run-all-migrations.ts",
    "migration:verify": "ts-node src/database/migrations/verify-migrations.ts",
    "migration:rollback": "ts-node src/database/migrations/rollback-all.ts",
    "migration:seed": "ts-node src/database/migrations/seed-test-data.ts",
    "migration:create": "typeorm migration:create",
    "migration:show": "typeorm migration:show"
  }
}
```

## Features

### Production-Ready Features

✅ **Transaction Support** - All migrations run in transactions
✅ **Idempotent** - Safe to run multiple times
✅ **Comprehensive Indexes** - Optimized for query performance
✅ **Foreign Key Constraints** - Data integrity enforced
✅ **Proper Error Handling** - Detailed error messages and rollback
✅ **Audit Logging** - Timestamps and user tracking
✅ **HIPAA Compliance** - Encryption support and audit trails

### Migration Features

#### Indexes Created
- **Single-column indexes** on frequently queried fields
- **Composite indexes** for common query patterns
- **Unique indexes** on business keys (claim numbers, tokens, etc.)
- **Timestamp indexes** for date-range queries

#### Data Types
- **UUID** primary keys (using `uuid_generate_v4()`)
- **ENUM** types for status fields
- **JSONB** for flexible metadata and structured data
- **Timestamp** fields with timezone support
- **Decimal** types for financial data

#### Constraints
- **NOT NULL** constraints on required fields
- **Foreign keys** with CASCADE deletes where appropriate
- **Unique constraints** on business-critical fields
- **Default values** for status and boolean fields

## Table Relationships

```
users (prerequisite)
  ├── tasks (patient, assignedTo, createdBy)
  ├── consents (userId)
  ├── claims (patientId, providerId)
  ├── medications (patientId, prescribedBy)
  │   ├── medication_schedules (medicationId, patientId)
  │   └── medication_adherence (medicationId, patientId, recordedBy)
  ├── appointments (patientId, providerId, createdBy)
  ├── conversations (patientId, providerId)
  │   └── messages (conversationId, senderId, replyToMessageId)
  ├── clinical_notes (patientId, providerId)
  ├── calls (patientId, providerId, initiatedBy, createdBy)
  │   ├── call_participants (callId, userId)
  │   └── call_recordings (callId, createdBy)
  ├── device_tokens (userId)
  └── ai_conversations (userId)
      └── ai_messages (conversationId)

encryption_keys (standalone, no FK constraints for security)
```

## Column Conventions

All tables follow these conventions:

### Primary Keys
- `id` - UUID primary key using `uuid_generate_v4()`

### Timestamps
- `createdAt` - Record creation timestamp
- `updatedAt` - Last update timestamp
- `deletedAt` - Soft delete timestamp (where applicable)

### Foreign Keys
- Suffix: `Id` (e.g., `userId`, `patientId`, `providerId`)
- Always UUID type
- Reference `users.id` table

### Status/Enum Fields
- Use PostgreSQL ENUM types
- Common values: `pending`, `active`, `completed`, `cancelled`

### Metadata
- `metadata` - JSONB column for flexible additional data
- `notes` - TEXT column for free-form notes

## Advanced Usage

### Custom Data Source Configuration

```typescript
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  logging: ['error', 'warn', 'migration'],
});
```

### Creating New Migrations

```bash
# Create a new migration
npm run migration:create -- src/database/migrations/AddUserPreferences

# Edit the generated file, then run
npm run migration:run
```

### Manual Migration Execution

```typescript
import { DataSource } from 'typeorm';

const dataSource = new DataSource({...});
await dataSource.initialize();

// Run migrations
await dataSource.runMigrations({ transaction: 'all' });

// Rollback last migration
await dataSource.undoLastMigration({ transaction: 'all' });
```

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** Check if tables already exist. Run verify script:
```bash
npm run migration:verify
```

### Issue: Foreign key constraint violations

**Solution:** Ensure users table exists and has test data:
```sql
SELECT COUNT(*) FROM users;
```

### Issue: UUID extension not found

**Solution:** Enable the extension manually:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Issue: Permission denied errors

**Solution:** Ensure database user has sufficient privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE vytalwatch TO your_username;
GRANT ALL ON SCHEMA public TO your_username;
```

## Best Practices

### DO ✅
- Always run migrations in a transaction
- Test migrations in development first
- Backup production database before migrations
- Review migration SQL before executing
- Use the verification script after migrations
- Keep migrations idempotent

### DON'T ❌
- Never modify executed migrations
- Don't skip migrations in sequence
- Don't run seed script in production
- Don't drop tables without backups
- Don't use `synchronize: true` with migrations
- Don't commit without testing rollback

## Deployment Checklist

Before deploying to production:

- [ ] Test all migrations in staging environment
- [ ] Run verification script and confirm all checks pass
- [ ] Backup production database
- [ ] Review migration execution plan
- [ ] Test rollback procedure
- [ ] Monitor database performance during migration
- [ ] Verify application compatibility with new schema
- [ ] Document any manual post-migration steps

## Support and Documentation

### TypeORM Documentation
- [TypeORM Migrations](https://typeorm.io/migrations)
- [TypeORM Query Builder](https://typeorm.io/select-query-builder)

### PostgreSQL Documentation
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

### HIPAA Compliance Resources
- [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [PostgreSQL Encryption](https://www.postgresql.org/docs/current/encryption-options.html)

## License

Copyright © 2026 VytalWatch. All rights reserved.

---

**Questions or Issues?**
Contact the development team or open an issue in the project repository.
