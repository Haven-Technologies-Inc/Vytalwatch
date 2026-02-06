import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { EncryptionService } from '../../src/encryption/encryption.service';
import { setupTestDatabase, cleanupTestDatabase } from '../database-helpers';

describe('Encryption Integration (e2e)', () => {
  let app: INestApplication;
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

  it('should encrypt and decrypt PHI data', async () => {
    const phi = 'SSN: 123-45-6789, DOB: 1980-01-01';
    const encrypted = await encryptionService.encrypt(phi);
    const decrypted = await encryptionService.decrypt(encrypted);

    expect(decrypted).toBe(phi);
    expect(encrypted).not.toBe(phi);
  });

  it('should use unique IV for each encryption', async () => {
    const data = 'Same data';
    const encrypted1 = await encryptionService.encrypt(data);
    const encrypted2 = await encryptionService.encrypt(data);

    expect(encrypted1).not.toBe(encrypted2);

    const meta1 = encryptionService.getMetadata(encrypted1);
    const meta2 = encryptionService.getMetadata(encrypted2);
    expect(meta1.iv).not.toBe(meta2.iv);
  });

  it('should support key rotation', async () => {
    const data = 'Sensitive data';
    const encrypted = await encryptionService.encrypt(data, { keyVersion: 1 });
    const reencrypted = await encryptionService.reencrypt(encrypted, 2);

    const oldMeta = encryptionService.getMetadata(encrypted);
    const newMeta = encryptionService.getMetadata(reencrypted);

    expect(oldMeta.version).toBe(1);
    expect(newMeta.version).toBe(2);

    const decrypted = await encryptionService.decrypt(reencrypted);
    expect(decrypted).toBe(data);
  });

  it('should verify data integrity with HMAC', async () => {
    const data = 'Important data';
    const hmac = await encryptionService.generateHMAC(data);
    const isValid = await encryptionService.verifyHMAC(data, hmac);

    expect(isValid).toBe(true);

    const tampered = 'Tampered data';
    const isInvalid = await encryptionService.verifyHMAC(tampered, hmac);
    expect(isInvalid).toBe(false);
  });
});
