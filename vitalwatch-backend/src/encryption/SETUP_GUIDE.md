# Field-Level PHI Encryption - Setup Guide

Complete guide for implementing field-level encryption in VytalWatch RPM.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Database Migration](#database-migration)
5. [Entity Updates](#entity-updates)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js >= 16
- PostgreSQL >= 12
- TypeORM configured
- NestJS application running

## Initial Setup

### Step 1: Generate Master Encryption Key

**⚠️ CRITICAL: Do this ONCE and store securely!**

```bash
# Generate a secure 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# 8f7a3b9c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
```

**⚠️ NEVER commit this key to version control!**

### Step 2: Store Master Key Securely

#### Option A: Environment Variable (Development)

```bash
# .env
ENCRYPTION_MASTER_KEY=8f7a3b9c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
```

#### Option B: AWS KMS (Production - Recommended)

```bash
# .env
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
AWS_REGION=us-east-1
```

#### Option C: Azure Key Vault (Production - Recommended)

```bash
# .env
AZURE_KEY_VAULT_URL=https://myvault.vault.azure.net/
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### Step 3: Enable Key Rotation (Optional but Recommended)

```bash
# .env
KEY_ROTATION_ENABLED=true
KEY_ROTATION_INTERVAL_DAYS=90  # Rotate every 90 days
```

## Configuration

### Update Environment Variables

Add to your `.env` file:

```bash
# Encryption Configuration
ENCRYPTION_MASTER_KEY=your_64_character_hex_key_here

# Key Rotation (Optional)
KEY_ROTATION_ENABLED=true
KEY_ROTATION_INTERVAL_DAYS=90

# AWS KMS (Optional - for production)
# AWS_KMS_KEY_ID=arn:aws:kms:...
# AWS_REGION=us-east-1

# Azure Key Vault (Optional - for production)
# AZURE_KEY_VAULT_URL=https://...
# AZURE_TENANT_ID=...
# AZURE_CLIENT_ID=...
# AZURE_CLIENT_SECRET=...
```

### Verify Module Import

The `EncryptionModule` should already be imported in `app.module.ts`:

```typescript
import { EncryptionModule } from './encryption/encryption.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    EncryptionModule, // Must be loaded early
    // ... other modules
  ],
})
export class AppModule {}
```

## Database Migration

### Phase 1: Add Encrypted Columns

For each entity you want to encrypt, add encrypted columns:

#### User Entity Migration

```sql
-- Add encrypted columns for User entity
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dateOfBirth_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfaSecret_encrypted TEXT;

-- Add hash columns for lookups
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailHash VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phoneHash VARCHAR(64);

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users(emailHash);
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phoneHash);
```

#### VitalReading Entity Migration

```sql
ALTER TABLE vital_readings ADD COLUMN IF NOT EXISTS values_encrypted TEXT;
ALTER TABLE vital_readings ADD COLUMN IF NOT EXISTS notes_encrypted TEXT;
ALTER TABLE vital_readings ADD COLUMN IF NOT EXISTS rawData_encrypted TEXT;
ALTER TABLE vital_readings ADD COLUMN IF NOT EXISTS aiAnalysis_encrypted TEXT;
```

#### ClinicalNote Entity Migration

```sql
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS content_encrypted TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS structuredData_encrypted TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS addendum_encrypted TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS billingNotes_encrypted TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS coSignatureNotes_encrypted TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS amendments_encrypted TEXT;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS signature_encrypted TEXT;
```

#### Medication Entity Migration

```sql
ALTER TABLE medications ADD COLUMN IF NOT EXISTS instructions_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS purpose_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescriptionNumber_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS pharmacy_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS pharmacyPhone_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS discontinuedReason_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS sideEffects_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS contraindications_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS interactions_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS warnings_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS precautions_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS notes_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS metadata_encrypted TEXT;
ALTER TABLE medications ADD COLUMN IF NOT EXISTS attachments_encrypted TEXT;
```

### Phase 2: Encrypt Existing Data

Create a migration script:

```typescript
// src/encryption/scripts/encrypt-existing-data.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { EncryptionService, encryptExistingData } from '../encryption';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const encryptionService = app.get(EncryptionService);

  try {
    // Encrypt User data
    console.log('Encrypting User data...');
    await encryptExistingData(dataSource, encryptionService, {
      tableName: 'users',
      fields: ['email', 'phone', 'dateOfBirth', 'address', 'ssn', 'mfaSecret'],
      batchSize: 100,
      dryRun: false, // Set to true for testing
      onProgress: (current, total) => {
        console.log(`Users: ${current}/${total}`);
      },
    });

    // Create hashes for email/phone lookups
    console.log('Creating lookup hashes...');
    await dataSource.query(`
      UPDATE users
      SET emailHash = encode(digest(lower(email), 'sha256'), 'hex')
      WHERE emailHash IS NULL AND email IS NOT NULL
    `);
    await dataSource.query(`
      UPDATE users
      SET phoneHash = encode(digest(lower(phone), 'sha256'), 'hex')
      WHERE phoneHash IS NULL AND phone IS NOT NULL
    `);

    // Encrypt VitalReading data
    console.log('Encrypting VitalReading data...');
    await encryptExistingData(dataSource, encryptionService, {
      tableName: 'vital_readings',
      fields: ['values', 'notes', 'rawData', 'aiAnalysis'],
      batchSize: 500,
      onProgress: (current, total) => {
        console.log(`Vital readings: ${current}/${total}`);
      },
    });

    // Encrypt ClinicalNote data
    console.log('Encrypting ClinicalNote data...');
    await encryptExistingData(dataSource, encryptionService, {
      tableName: 'clinical_notes',
      fields: [
        'content',
        'structuredData',
        'addendum',
        'billingNotes',
        'coSignatureNotes',
        'amendments',
        'signature',
      ],
      batchSize: 100,
      onProgress: (current, total) => {
        console.log(`Clinical notes: ${current}/${total}`);
      },
    });

    // Encrypt Medication data
    console.log('Encrypting Medication data...');
    await encryptExistingData(dataSource, encryptionService, {
      tableName: 'medications',
      fields: [
        'instructions',
        'purpose',
        'prescriptionNumber',
        'pharmacy',
        'pharmacyPhone',
        'discontinuedReason',
        'sideEffects',
        'contraindications',
        'interactions',
        'warnings',
        'precautions',
        'notes',
        'metadata',
        'attachments',
      ],
      batchSize: 200,
      onProgress: (current, total) => {
        console.log(`Medications: ${current}/${total}`);
      },
    });

    console.log('✅ Encryption migration completed successfully!');
  } catch (error) {
    console.error('❌ Encryption migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
```

Run the migration:

```bash
npx ts-node src/encryption/scripts/encrypt-existing-data.ts
```

### Phase 3: Verify Encryption

```typescript
// src/encryption/scripts/verify-encryption.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { EncryptionService, verifyEncryptionIntegrity } from '../encryption';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const encryptionService = app.get(EncryptionService);

  try {
    // Verify User encryption
    const userResults = await verifyEncryptionIntegrity(
      dataSource,
      encryptionService,
      'users',
      ['email', 'phone', 'dateOfBirth', 'address', 'ssn', 'mfaSecret'],
    );
    console.log('User verification:', userResults);

    // Verify other entities...

    if (userResults.failed === 0) {
      console.log('✅ All encryption verified successfully!');
    } else {
      console.error('❌ Some encryption verification failed!');
      console.error('Errors:', userResults.errors);
    }
  } finally {
    await app.close();
  }
}

bootstrap();
```

## Entity Updates

### Update User Entity

Replace the entity file with the encrypted version:

```bash
# Backup original
cp src/users/entities/user.entity.ts src/users/entities/user.entity.ts.backup

# Update with encrypted version
cp src/encryption/examples/user.entity.encrypted.example.ts src/users/entities/user.entity.ts
```

### Update Services

Update services to use hash-based lookups:

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Find user by email using hash
  async findByEmail(email: string): Promise<User | null> {
    const emailHash = crypto
      .createHash('sha256')
      .update(email.toLowerCase())
      .digest('hex');

    return await this.usersRepository.findOne({
      where: { emailHash },
    });
  }

  // Create user with encryption
  async create(userData: Partial<User>): Promise<User> {
    const user = new User();

    // Set encrypted fields using helper methods
    if (userData.email) {
      user.setEmail(userData.email);
    }
    if (userData.phone) {
      user.setPhone(userData.phone);
    }

    // Set other fields
    user.firstName = userData.firstName;
    user.lastName = userData.lastName;
    user.dateOfBirth = userData.dateOfBirth;
    // ... etc

    return await this.usersRepository.save(user);
  }
}
```

## Testing

### Unit Tests

```typescript
// src/encryption/encryption.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        KeyManagementService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'ENCRYPTION_MASTER_KEY') {
                return '8f7a3b9c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should encrypt and decrypt string', async () => {
    const original = 'Hello, World!';
    const encrypted = await service.encrypt(original);
    const decrypted = await service.decrypt(encrypted);

    expect(decrypted).toBe(original);
    expect(encrypted).not.toBe(original);
  });

  it('should encrypt and decrypt object', async () => {
    const original = { name: 'John', age: 30 };
    const encrypted = await service.encrypt(original);
    const decrypted = await service.decrypt(encrypted);

    expect(decrypted).toEqual(original);
  });

  it('should handle null values', async () => {
    const encrypted = await service.encrypt(null);
    expect(encrypted).toBeNull();
  });
});
```

### Integration Tests

Test with actual entities:

```typescript
// src/users/users.service.spec.ts
describe('UsersService with Encryption', () => {
  it('should create user with encrypted fields', async () => {
    const userData = {
      email: 'test@example.com',
      phone: '555-1234',
      firstName: 'John',
      lastName: 'Doe',
    };

    const user = await usersService.create(userData);

    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email); // Decrypted on load
    expect(user.emailHash).toBeDefined();
  });

  it('should find user by email', async () => {
    const user = await usersService.findByEmail('test@example.com');

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

## Deployment

### Pre-Deployment Checklist

- [ ] Master key is securely stored (KMS, Key Vault)
- [ ] Master key is NOT in version control
- [ ] Database migrations completed successfully
- [ ] Existing data encrypted and verified
- [ ] All tests passing
- [ ] Health checks configured
- [ ] Monitoring alerts set up
- [ ] Rollback plan prepared
- [ ] Team trained on encryption system

### Deployment Steps

1. **Deploy database migrations** (Phase 1 - add columns)
2. **Run encryption migration** (Phase 2 - encrypt data)
3. **Verify encryption** (Phase 3 - verify all data)
4. **Deploy application code** with updated entities
5. **Monitor for errors**
6. **(Optional) Drop plaintext columns** after verification period

### Rollback Plan

If issues occur:

1. Revert application code to previous version
2. Plaintext columns still exist (don't drop until stable)
3. Data remains accessible in plaintext until ready

## Monitoring

### Health Checks

Add to your health check endpoint:

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { EncryptionHealthService } from '../encryption';

@Controller('health')
export class HealthController {
  constructor(
    private readonly encryptionHealth: EncryptionHealthService,
  ) {}

  @Get('encryption')
  async checkEncryption() {
    return await this.encryptionHealth.checkHealth();
  }

  @Get('encryption/metrics')
  async getEncryptionMetrics() {
    return await this.encryptionHealth.getMetrics();
  }
}
```

### Monitoring Alerts

Set up alerts for:

- Key expiration (< 7 days)
- Encryption failures
- Decryption failures
- Key rotation failures

### Logging

All encryption operations are logged. Monitor logs for:

- `ERROR` - Encryption/decryption failures
- `WARN` - Key expiration warnings
- `INFO` - Key rotation events

## Troubleshooting

### "Master encryption key not configured"

**Solution:** Set `ENCRYPTION_MASTER_KEY` in environment variables.

### "Failed to decrypt data"

**Possible causes:**
1. Wrong master key
2. Corrupted data
3. Key version mismatch

**Solution:**
- Verify master key is correct
- Check key version in metadata
- Verify data integrity

### Performance issues

**Solutions:**
1. Use batch operations for migrations
2. Enable parallel processing for bulk operations
3. Consider caching frequently accessed decrypted data (with caution)

### Cannot find users by email after encryption

**Solution:** Use hash-based lookup:

```typescript
// WRONG
const user = await this.usersRepository.findOne({ where: { email } });

// CORRECT
const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
const user = await this.usersRepository.findOne({ where: { emailHash } });
```

## Support

For issues or questions:
1. Check this guide and README.md
2. Review example files in `src/encryption/examples/`
3. Check logs for detailed error messages
4. Contact the development team

## Security Notes

⚠️ **CRITICAL SECURITY REMINDERS:**

1. **NEVER commit master key to version control**
2. **Use different keys for dev/staging/production**
3. **Rotate keys regularly (90 days recommended)**
4. **Store keys in KMS/Key Vault in production**
5. **Enable audit logging for all key access**
6. **Implement proper access controls**
7. **Regular security audits of encryption system**
8. **Have incident response plan for key compromise**

## Compliance

This encryption system helps meet:

- **HIPAA** §164.312(a)(2)(iv) - Encryption and decryption
- **HIPAA** §164.312(e)(2)(ii) - Transmission security
- **PCI DSS** (if handling payment data)
- **GDPR** Article 32 - Security of processing

Regular audits recommended for ongoing compliance.
