import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { EncryptionService } from '../../src/encryption/encryption.service';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Encryption Security Tests', () => {
  let app;
  let encryptionService: EncryptionService;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    encryptionService = app.get<EncryptionService>(EncryptionService);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  it('should use AES-256-GCM encryption', async () => {
    const data = 'Sensitive PHI data';
    const encrypted = await encryptionService.encrypt(data);
    const metadata = encryptionService.getMetadata(encrypted);

    expect(metadata.algorithm).toBe('aes-256-gcm');
  });

  it('should use unique IV for each encryption', async () => {
    const data = 'Same data';
    const encrypted1 = await encryptionService.encrypt(data);
    const encrypted2 = await encryptionService.encrypt(data);

    const meta1 = encryptionService.getMetadata(encrypted1);
    const meta2 = encryptionService.getMetadata(encrypted2);

    expect(meta1.iv).not.toBe(meta2.iv);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should detect tampering via authentication tag', async () => {
    const data = 'Important data';
    const encrypted = await encryptionService.encrypt(data);

    // Tamper with ciphertext
    const metadata = JSON.parse(encrypted);
    metadata.ciphertext = Buffer.from('tampered').toString('base64');
    const tampered = JSON.stringify(metadata);

    await expect(encryptionService.decrypt(tampered)).rejects.toThrow();
  });

  it('should prevent decryption with wrong key', async () => {
    const data = 'Encrypted with key version 1';
    const encrypted = await encryptionService.encrypt(data, { keyVersion: 1 });

    // Attempt to decrypt with different key version
    const metadata = JSON.parse(encrypted);
    metadata.version = 999; // Non-existent key
    const modifiedEncrypted = JSON.stringify(metadata);

    await expect(encryptionService.decrypt(modifiedEncrypted)).rejects.toThrow();
  });

  it('should securely generate HMAC', async () => {
    const data1 = 'Data 1';
    const data2 = 'Data 2';

    const hmac1 = await encryptionService.generateHMAC(data1);
    const hmac2 = await encryptionService.generateHMAC(data2);

    expect(hmac1).not.toBe(hmac2);
    expect(hmac1.length).toBe(64); // SHA-256 hex
  });

  it('should use constant-time comparison', async () => {
    const password = 'SecurePassword123!';
    const encrypted = await encryptionService.encrypt(password);

    const startTime = Date.now();
    await encryptionService.constantTimeCompare(encrypted, 'WrongPassword');
    const wrongDuration = Date.now() - startTime;

    const startTime2 = Date.now();
    await encryptionService.constantTimeCompare(encrypted, password);
    const correctDuration = Date.now() - startTime2;

    // Timing should be similar (within reasonable margin)
    const timingDiff = Math.abs(wrongDuration - correctDuration);
    expect(timingDiff).toBeLessThan(50); // Allow 50ms variation
  });
});
