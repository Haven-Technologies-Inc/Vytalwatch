# Field-Level PHI Encryption

HIPAA-compliant field-level encryption system for VytalWatch RPM using AES-256-GCM.

## Features

- **AES-256-GCM Encryption**: Authenticated encryption with integrity verification
- **Unique IVs**: Each field encryption uses a unique initialization vector
- **Key Versioning**: Support for multiple key versions for seamless rotation
- **Automatic Key Rotation**: Configurable automatic key rotation with grace periods
- **Key Derivation**: PBKDF2 with 100,000 iterations for secure key derivation
- **TypeORM Integration**: Transparent encryption/decryption with `@EncryptedColumn()` decorator
- **Batch Operations**: Efficient batch encryption/decryption for migrations
- **Health Monitoring**: Built-in health checks for encryption system
- **Audit Logging**: Comprehensive audit trail of encryption operations
- **HIPAA Compliance**: Meets HIPAA technical safeguards requirements

## Installation

1. Install the module in your AppModule:

```typescript
import { EncryptionModule } from './encryption';

@Module({
  imports: [
    EncryptionModule,
    // ... other modules
  ],
})
export class AppModule {}
```

2. Set the master encryption key in your environment:

```bash
# Generate a new master key (DO THIS ONCE ONLY)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_MASTER_KEY=your_64_character_hex_key_here

# Optional: Enable automatic key rotation
KEY_ROTATION_ENABLED=true
KEY_ROTATION_INTERVAL_DAYS=90
```

## Usage

### Basic Encryption with @EncryptedColumn()

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { EncryptedColumn } from '../encryption';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Encrypt sensitive PHI fields
  @EncryptedColumn()
  ssn: string;

  @EncryptedColumn({ columnOptions: { nullable: true } })
  dateOfBirth: Date;

  @EncryptedColumn()
  phone: string;

  @EncryptedColumn()
  email: string;

  @EncryptedColumn({ columnOptions: { type: 'text', nullable: true } })
  address: string;

  // Regular unencrypted fields
  @Column()
  firstName: string;

  @Column()
  lastName: string;
}
```

### Direct Encryption/Decryption

```typescript
import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../encryption';

@Injectable()
export class MyService {
  constructor(private readonly encryptionService: EncryptionService) {}

  async encryptSensitiveData(data: string): Promise<string> {
    return await this.encryptionService.encrypt(data);
  }

  async decryptSensitiveData(encryptedData: string): Promise<string> {
    return await this.encryptionService.decrypt(encryptedData);
  }

  // Batch operations for performance
  async encryptMultiple(values: string[]): Promise<string[]> {
    return await this.encryptionService.batchEncrypt(values, {
      batchSize: 100,
      parallel: true,
      onProgress: (current, total) => {
        console.log(`Progress: ${current}/${total}`);
      },
    });
  }
}
```

### Encrypting Existing Data

Use the migration helpers to encrypt existing plaintext data:

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EncryptionService, encryptExistingData } from '../encryption';

@Injectable()
export class EncryptionMigrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly encryptionService: EncryptionService,
  ) {}

  async migrateUserData() {
    const result = await encryptExistingData(
      this.dataSource,
      this.encryptionService,
      {
        tableName: 'users',
        fields: ['ssn', 'dateOfBirth', 'phone', 'email', 'address'],
        batchSize: 100,
        dryRun: false, // Set to true to test without making changes
        onProgress: (processed, total) => {
          console.log(`Encrypted ${processed}/${total} user records`);
        },
      },
    );

    console.log(`Migration complete. Encrypted ${result} records.`);
  }
}
```

### Key Rotation

```typescript
import { Injectable } from '@nestjs/common';
import { KeyManagementService, migrateToNewKey } from '../encryption';

@Injectable()
export class KeyRotationService {
  constructor(
    private readonly keyManagement: KeyManagementService,
    private readonly encryptionService: EncryptionService,
    private readonly dataSource: DataSource,
  ) {}

  async rotateKeys() {
    // Rotate to new key version
    const newVersion = await this.keyManagement.rotateKeys();
    console.log(`Rotated to key version: ${newVersion}`);

    // Re-encrypt all data with new key
    await migrateToNewKey(
      this.dataSource,
      this.encryptionService,
      this.keyManagement,
      {
        tableName: 'users',
        fields: ['ssn', 'dateOfBirth', 'phone', 'email', 'address'],
        batchSize: 50,
      },
    );

    console.log('Key rotation complete');
  }

  async getKeyStatus() {
    const status = await this.keyManagement.getRotationStatus();
    console.log('Current key version:', status.currentVersion);
    console.log('Expires at:', status.expiresAt);
    console.log('Days until expiration:', status.daysUntilExpiration);
  }
}
```

### Health Checks

```typescript
import { Injectable } from '@nestjs/common';
import { EncryptionHealthService } from '../encryption';

@Injectable()
export class HealthCheckService {
  constructor(private readonly encryptionHealth: EncryptionHealthService) {}

  async checkEncryptionHealth() {
    const health = await this.encryptionHealth.checkHealth();

    if (!health.healthy) {
      console.error('Encryption system is unhealthy:', health.errors);
    }

    if (health.warnings.length > 0) {
      console.warn('Encryption warnings:', health.warnings);
    }

    return health;
  }

  async getEncryptionMetrics() {
    return await this.encryptionHealth.getMetrics();
  }
}
```

## Database Migration

### Step 1: Add Encrypted Columns

Generate SQL migration to add encrypted columns:

```typescript
import { generateAddEncryptedColumnsMigration } from '../encryption';

const sql = generateAddEncryptedColumnsMigration('users', [
  'ssn',
  'dateOfBirth',
  'phone',
  'email',
  'address',
]);

console.log(sql);
```

This generates SQL like:

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ssn_encrypted" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateOfBirth_encrypted" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_encrypted" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_encrypted" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_encrypted" TEXT;
```

### Step 2: Encrypt Existing Data

Run the encryption migration:

```bash
npm run migration:encrypt-user-data
```

### Step 3: Verify Encryption

```typescript
import { verifyEncryptionIntegrity, getEncryptionStats } from '../encryption';

// Verify all data can be decrypted
const verification = await verifyEncryptionIntegrity(
  dataSource,
  encryptionService,
  'users',
  ['ssn', 'dateOfBirth', 'phone', 'email', 'address'],
);

console.log('Verification results:', verification);

// Get encryption statistics
const stats = await getEncryptionStats(dataSource, 'users', [
  'ssn',
  'dateOfBirth',
  'phone',
  'email',
  'address',
]);

console.log('Encryption stats:', stats);
```

### Step 4: Drop Plaintext Columns (Optional)

After verifying encryption is working:

```sql
ALTER TABLE "users" DROP COLUMN IF EXISTS "ssn";
ALTER TABLE "users" DROP COLUMN IF EXISTS "dateOfBirth";
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";
ALTER TABLE "users" DROP COLUMN IF EXISTS "address";
```

## Security Best Practices

### Master Key Management

1. **Never commit the master key to version control**
2. **Store in environment variables or external KMS** (AWS KMS, Azure Key Vault)
3. **Rotate master key annually** (requires re-encrypting all data)
4. **Use different keys for dev/staging/production**

```bash
# Development
ENCRYPTION_MASTER_KEY=dev_key_here

# Production (use AWS KMS or Azure Key Vault)
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/...
# or
AZURE_KEY_VAULT_URL=https://myvault.vault.azure.net/
```

### Key Rotation

Enable automatic key rotation:

```bash
KEY_ROTATION_ENABLED=true
KEY_ROTATION_INTERVAL_DAYS=90  # Rotate every 90 days
```

### Audit Logging

All encryption operations are logged:

```typescript
const auditLogs = keyManagement.getAuditLogs(100);
console.log('Recent encryption operations:', auditLogs);
```

### Performance Optimization

Use batch operations for large datasets:

```typescript
// Good: Batch encryption
const encrypted = await encryptionService.batchEncrypt(values, {
  batchSize: 100,
  parallel: true,
});

// Avoid: Individual encryption in loops
for (const value of values) {
  await encryptionService.encrypt(value); // Slow!
}
```

## HIPAA Compliance

This encryption system meets HIPAA technical safeguards:

- ✅ **164.312(a)(2)(iv)**: Encryption and decryption
- ✅ **164.312(e)(2)(ii)**: Encryption of PHI
- ✅ **164.308(a)(1)(ii)(D)**: Information system activity review (audit logs)
- ✅ **164.312(a)(1)**: Access control
- ✅ **164.312(c)(1)**: Integrity controls

## Troubleshooting

### "Master encryption key not configured"

Set the `ENCRYPTION_MASTER_KEY` environment variable:

```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_MASTER_KEY=your_key_here
```

### "Failed to decrypt data"

Possible causes:
1. Wrong master key
2. Corrupted data
3. Inactive key version

Check key status:

```typescript
const status = await keyManagement.getRotationStatus();
console.log('Current key version:', status.currentVersion);
```

### Performance Issues

Use batch operations and enable parallel processing:

```typescript
await encryptionService.batchEncrypt(values, {
  batchSize: 100,
  parallel: true,
});
```

## API Reference

See TypeScript definitions in `types.ts` for complete API documentation.

## License

Proprietary - VytalWatch RPM
