# Field-Level PHI Encryption - Quick Reference

## 🚀 Quick Start

### 1. Generate Master Key (One Time Only)
```bash
npx ts-node src/encryption/scripts/generate-master-key.ts
```

### 2. Set Environment Variables
```bash
# .env
ENCRYPTION_MASTER_KEY=your_64_character_hex_key
KEY_ROTATION_ENABLED=true
KEY_ROTATION_INTERVAL_DAYS=90
```

### 3. Module Already Imported
The `EncryptionModule` is already imported in `app.module.ts`. No action needed.

## 📝 Common Use Cases

### Encrypt a Field in Entity

```typescript
import { EncryptedColumn } from '../encryption';

@Entity('users')
export class User {
  @EncryptedColumn()
  ssn: string;

  @EncryptedColumn({ columnOptions: { nullable: true } })
  dateOfBirth: Date;
}
```

### Manual Encryption/Decryption

```typescript
import { EncryptionService } from '../encryption';

@Injectable()
export class MyService {
  constructor(private encryption: EncryptionService) {}

  async encryptData(plaintext: string): Promise<string> {
    return await this.encryption.encrypt(plaintext);
  }

  async decryptData(ciphertext: string): Promise<string> {
    return await this.encryption.decrypt(ciphertext);
  }
}
```

### Batch Operations

```typescript
// Encrypt multiple values
const encrypted = await encryptionService.batchEncrypt(values, {
  batchSize: 100,
  parallel: true,
});

// Decrypt multiple values
const decrypted = await encryptionService.batchDecrypt(encrypted);
```

### Find by Encrypted Field

For searchable fields like email, use hash-based lookup:

```typescript
import * as crypto from 'crypto';

// Create hash
const emailHash = crypto
  .createHash('sha256')
  .update(email.toLowerCase())
  .digest('hex');

// Find user
const user = await userRepository.findOne({ where: { emailHash } });
```

### Health Check

```typescript
import { EncryptionHealthService } from '../encryption';

const health = await encryptionHealth.checkHealth();
console.log(health);
// {
//   healthy: true,
//   keyAvailable: true,
//   keyVersion: 1,
//   daysUntilExpiration: 85,
//   warnings: [],
//   errors: []
// }
```

### Key Rotation

```typescript
import { KeyManagementService } from '../encryption';

// Rotate to new key version
const newVersion = await keyManagement.rotateKeys();

// Re-encrypt data with new key
await migrateToNewKey(dataSource, encryptionService, keyManagement, {
  tableName: 'users',
  fields: ['email', 'phone'],
});
```

## 🗄️ Database Migration

### Add Encrypted Columns

```sql
ALTER TABLE users ADD COLUMN email_encrypted TEXT;
ALTER TABLE users ADD COLUMN phone_encrypted TEXT;
ALTER TABLE users ADD COLUMN emailHash VARCHAR(64);
CREATE UNIQUE INDEX idx_users_email_hash ON users(emailHash);
```

### Encrypt Existing Data

```typescript
import { encryptExistingData } from '../encryption';

await encryptExistingData(dataSource, encryptionService, {
  tableName: 'users',
  fields: ['email', 'phone'],
  batchSize: 100,
  onProgress: (current, total) => {
    console.log(`${current}/${total}`);
  },
});
```

### Verify Encryption

```typescript
import { verifyEncryptionIntegrity } from '../encryption';

const results = await verifyEncryptionIntegrity(
  dataSource,
  encryptionService,
  'users',
  ['email', 'phone'],
);

console.log(`Verified: ${results.verified}, Failed: ${results.failed}`);
```

## 🔑 Supported Data Types

| Type | Example | Encrypted As |
|------|---------|-------------|
| String | `"Hello"` | String |
| Number | `123` | String |
| Boolean | `true` | String |
| Date | `new Date()` | ISO String |
| Object | `{ a: 1 }` | JSON String |
| Array | `[1, 2, 3]` | JSON String |
| null | `null` | null |

## 🏥 PHI Fields to Encrypt

### User Entity
- ✅ `ssn` - Social Security Number
- ✅ `dateOfBirth` - Date of birth
- ✅ `phone` - Phone number
- ✅ `email` - Email address
- ✅ `address` - Physical address
- ✅ `mfaSecret` - MFA secret

### VitalReading Entity
- ✅ `values` - Vital measurements
- ✅ `notes` - Patient notes
- ✅ `rawData` - Device data
- ✅ `aiAnalysis` - AI results

### ClinicalNote Entity
- ✅ `content` - Main content
- ✅ `structuredData` - SOAP notes
- ✅ `addendum` - Addendum
- ✅ `billingNotes` - Billing info
- ✅ `signature` - Digital signature

### Medication Entity
- ✅ `instructions` - Dosing instructions
- ✅ `purpose` - Medical indication
- ✅ `prescriptionNumber` - Rx number
- ✅ `pharmacy` - Pharmacy info
- ✅ `notes` - Clinical notes

## 🔍 Debugging

### Check if Data is Encrypted

```typescript
const isEncrypted = encryptionService.isEncrypted(data);
console.log('Is encrypted:', isEncrypted);
```

### Get Encryption Metadata

```typescript
const metadata = encryptionService.getMetadata(encryptedData);
console.log('Key version:', metadata.version);
console.log('Encrypted at:', new Date(metadata.timestamp));
```

### View Audit Logs

```typescript
const logs = keyManagement.getAuditLogs(100);
logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.operation} - ${log.success}`);
});
```

## ⚠️ Common Pitfalls

### ❌ DON'T: Query encrypted fields directly
```typescript
// Won't work - encrypted data can't be queried
await userRepository.findOne({ where: { email: 'test@example.com' } });
```

### ✅ DO: Use hash-based lookup
```typescript
const emailHash = crypto.createHash('sha256')
  .update('test@example.com'.toLowerCase())
  .digest('hex');
await userRepository.findOne({ where: { emailHash } });
```

### ❌ DON'T: Forget to await encryption
```typescript
// Wrong - returns Promise, not encrypted string
const encrypted = encryptionService.encrypt(data);
```

### ✅ DO: Always await async operations
```typescript
// Correct
const encrypted = await encryptionService.encrypt(data);
```

### ❌ DON'T: Commit master key to git
```typescript
// NEVER do this
const MASTER_KEY = '8f7a3b9c...'; // Hardcoded
```

### ✅ DO: Use environment variables
```typescript
// Correct
const masterKey = process.env.ENCRYPTION_MASTER_KEY;
```

## 📊 Performance Tips

1. **Use batch operations** for multiple records
2. **Enable parallel processing** for better throughput
3. **Cache decrypted data** temporarily in memory (with caution)
4. **Use appropriate batch sizes** (100-500 recommended)
5. **Index hash columns** for fast lookups

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| "Master encryption key not configured" | Set `ENCRYPTION_MASTER_KEY` in `.env` |
| "Failed to decrypt data" | Check master key is correct |
| "Cannot find user by email" | Use `emailHash` for lookup |
| Performance issues | Use batch operations |
| Key expired | Run key rotation |

## 📚 Documentation

- **README.md** - Complete usage guide
- **SETUP_GUIDE.md** - Step-by-step setup
- **IMPLEMENTATION_SUMMARY.md** - Technical overview
- **examples/** - Working code examples

## 🔐 Security Checklist

- [ ] Master key stored securely (not in code)
- [ ] Different keys for dev/staging/production
- [ ] `.env` file in `.gitignore`
- [ ] Key rotation enabled
- [ ] Audit logging configured
- [ ] Health checks monitored
- [ ] Backup strategy in place
- [ ] Team trained on encryption system

## 🎯 Next Steps

1. ✅ Generate master key
2. ✅ Configure environment
3. ✅ Run database migrations
4. ✅ Encrypt existing data
5. ✅ Update entities
6. ✅ Test thoroughly
7. ✅ Deploy to production
8. ✅ Monitor health checks

## 💡 Pro Tips

- **Always test with dry run first** (`dryRun: true`)
- **Keep plaintext columns** during migration (drop later)
- **Verify encryption** before dropping plaintext columns
- **Monitor key expiration** (30 days warning)
- **Document key rotation schedule**
- **Have rollback plan ready**

---

For detailed information, see [README.md](./README.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md)
