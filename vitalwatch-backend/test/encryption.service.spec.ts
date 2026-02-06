import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../src/encryption/encryption.service';
import { KeyManagementService } from '../src/encryption/key-management.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let keyManagementService: KeyManagementService;
  let configService: ConfigService;

  const mockKeyManagementService = {
    getCurrentKeyVersion: jest.fn(),
    getKey: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock encryption key (32 bytes for AES-256)
  const mockEncryptionKey = Buffer.from('12345678901234567890123456789012');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: KeyManagementService,
          useValue: mockKeyManagementService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    keyManagementService = module.get<KeyManagementService>(KeyManagementService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup default mock behavior
    mockKeyManagementService.getCurrentKeyVersion.mockResolvedValue(1);
    mockKeyManagementService.getKey.mockResolvedValue(mockEncryptionKey);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt a string value', async () => {
      // Arrange
      const plaintext = 'Sensitive patient data';

      // Act
      const encrypted = await service.encrypt(plaintext);

      // Assert
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);

      // Verify it's valid JSON
      const metadata = JSON.parse(encrypted);
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('iv');
      expect(metadata).toHaveProperty('authTag');
      expect(metadata).toHaveProperty('ciphertext');
      expect(metadata).toHaveProperty('algorithm');
      expect(metadata).toHaveProperty('timestamp');
    });

    it('should encrypt with different IVs each time', async () => {
      // Arrange
      const plaintext = 'Same plaintext';

      // Act
      const encrypted1 = await service.encrypt(plaintext);
      const encrypted2 = await service.encrypt(plaintext);

      // Assert
      expect(encrypted1).not.toBe(encrypted2);

      const metadata1 = JSON.parse(encrypted1);
      const metadata2 = JSON.parse(encrypted2);
      expect(metadata1.iv).not.toBe(metadata2.iv);
    });

    it('should encrypt null values', async () => {
      // Act
      const result = await service.encrypt(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should encrypt objects', async () => {
      // Arrange
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        dob: '1980-01-01',
      };

      // Act
      const encrypted = await service.encrypt(obj);

      // Assert
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      const metadata = JSON.parse(encrypted);
      expect(metadata.ciphertext).toBeDefined();
    });

    it('should encrypt numbers', async () => {
      // Arrange
      const number = 42;

      // Act
      const encrypted = await service.encrypt(number);

      // Assert
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should use specified key version', async () => {
      // Arrange
      const plaintext = 'Test data';
      const keyVersion = 5;

      // Act
      await service.encrypt(plaintext, { keyVersion });

      // Assert
      expect(keyManagementService.getKey).toHaveBeenCalledWith(keyVersion);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data', async () => {
      // Arrange
      const plaintext = 'Sensitive patient data';
      const encrypted = await service.encrypt(plaintext);

      // Act
      const decrypted = await service.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt null values', async () => {
      // Act
      const result = await service.decrypt(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should decrypt objects', async () => {
      // Arrange
      const obj = {
        firstName: 'John',
        lastName: 'Doe',
        medicalRecordNumber: 'MRN-12345',
      };

      const encrypted = await service.encrypt(obj);

      // Act
      const decrypted = await service.decrypt(encrypted);

      // Assert
      expect(decrypted).toEqual(obj);
    });

    it('should throw error for invalid encrypted data', async () => {
      // Arrange
      const invalidData = 'not-encrypted-data';

      // Act & Assert
      await expect(service.decrypt(invalidData)).rejects.toThrow();
    });

    it('should throw error if authentication tag is invalid', async () => {
      // Arrange
      const plaintext = 'Test data';
      const encrypted = await service.encrypt(plaintext);

      // Tamper with the ciphertext
      const metadata = JSON.parse(encrypted);
      metadata.ciphertext = Buffer.from('tampered', 'utf8').toString('base64');
      const tamperedData = JSON.stringify(metadata);

      // Act & Assert
      await expect(service.decrypt(tamperedData)).rejects.toThrow();
    });

    it('should validate timestamp if required', async () => {
      // Arrange
      const plaintext = 'Test data';
      const encrypted = await service.encrypt(plaintext);

      // Mock old timestamp
      const metadata = JSON.parse(encrypted);
      metadata.timestamp = Date.now() - 86400000 * 2; // 2 days ago
      const oldData = JSON.stringify(metadata);

      // Act & Assert
      await expect(
        service.decrypt(oldData, {
          validateTimestamp: true,
          maxAge: 86400000, // 1 day
        }),
      ).rejects.toThrow('Encrypted data has expired');
    });
  });

  describe('batchEncrypt', () => {
    it('should encrypt multiple values in parallel', async () => {
      // Arrange
      const values = ['value1', 'value2', 'value3', 'value4', 'value5'];

      // Act
      const encrypted = await service.batchEncrypt(values, { parallel: true });

      // Assert
      expect(encrypted).toHaveLength(5);
      encrypted.forEach((enc) => {
        expect(typeof enc).toBe('string');
        const metadata = JSON.parse(enc);
        expect(metadata).toHaveProperty('ciphertext');
      });
    });

    it('should encrypt multiple values sequentially', async () => {
      // Arrange
      const values = ['value1', 'value2', 'value3'];

      // Act
      const encrypted = await service.batchEncrypt(values, { parallel: false });

      // Assert
      expect(encrypted).toHaveLength(3);
    });

    it('should call progress callback', async () => {
      // Arrange
      const values = ['value1', 'value2', 'value3'];
      const progressCallback = jest.fn();

      // Act
      await service.batchEncrypt(values, {
        onProgress: progressCallback,
        batchSize: 1,
      });

      // Assert
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('batchDecrypt', () => {
    it('should decrypt multiple encrypted values', async () => {
      // Arrange
      const values = ['value1', 'value2', 'value3'];
      const encrypted = await service.batchEncrypt(values);

      // Act
      const decrypted = await service.batchDecrypt(encrypted);

      // Assert
      expect(decrypted).toEqual(values);
    });
  });

  describe('reencrypt', () => {
    it('should re-encrypt data with new key version', async () => {
      // Arrange
      const plaintext = 'Sensitive data';
      const encrypted = await service.encrypt(plaintext, { keyVersion: 1 });

      // Mock new key version
      mockKeyManagementService.getCurrentKeyVersion.mockResolvedValue(2);

      // Act
      const reencrypted = await service.reencrypt(encrypted, 2);

      // Assert
      const metadata = JSON.parse(reencrypted);
      expect(metadata.version).toBe(2);

      // Verify data is still same after decryption
      const decrypted = await service.decrypt(reencrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for matching values', async () => {
      // Arrange
      const plaintext = 'password123';
      const encrypted = await service.encrypt(plaintext);

      // Act
      const result = await service.constantTimeCompare(encrypted, plaintext);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-matching values', async () => {
      // Arrange
      const plaintext = 'password123';
      const encrypted = await service.encrypt(plaintext);

      // Act
      const result = await service.constantTimeCompare(encrypted, 'wrongpassword');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if decryption fails', async () => {
      // Arrange
      const invalidEncrypted = 'invalid-data';

      // Act
      const result = await service.constantTimeCompare(invalidEncrypted, 'anything');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should extract metadata without decrypting', async () => {
      // Arrange
      const plaintext = 'Test data';
      const encrypted = await service.encrypt(plaintext);

      // Act
      const metadata = service.getMetadata(encrypted);

      // Assert
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('iv');
      expect(metadata).toHaveProperty('authTag');
      expect(metadata).toHaveProperty('ciphertext');
      expect(metadata).toHaveProperty('algorithm');
    });

    it('should return null for invalid data', () => {
      // Arrange
      const invalidData = 'not-json';

      // Act
      const metadata = service.getMetadata(invalidData);

      // Assert
      expect(metadata).toBeNull();
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', async () => {
      // Arrange
      const plaintext = 'Test data';
      const encrypted = await service.encrypt(plaintext);

      // Act
      const result = service.isEncrypted(encrypted);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for plain text', () => {
      // Arrange
      const plaintext = 'Plain text data';

      // Act
      const result = service.isEncrypted(plaintext);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for non-string values', () => {
      // Arrange
      const notString = 12345;

      // Act
      const result = service.isEncrypted(notString);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateHMAC', () => {
    it('should generate HMAC for data integrity', async () => {
      // Arrange
      const data = 'Important data';

      // Act
      const hmac = await service.generateHMAC(data);

      // Assert
      expect(hmac).toBeDefined();
      expect(typeof hmac).toBe('string');
      expect(hmac.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate same HMAC for same data', async () => {
      // Arrange
      const data = 'Important data';

      // Act
      const hmac1 = await service.generateHMAC(data);
      const hmac2 = await service.generateHMAC(data);

      // Assert
      expect(hmac1).toBe(hmac2);
    });

    it('should generate different HMACs for different data', async () => {
      // Arrange
      const data1 = 'Data 1';
      const data2 = 'Data 2';

      // Act
      const hmac1 = await service.generateHMAC(data1);
      const hmac2 = await service.generateHMAC(data2);

      // Assert
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('verifyHMAC', () => {
    it('should verify valid HMAC', async () => {
      // Arrange
      const data = 'Important data';
      const hmac = await service.generateHMAC(data);

      // Act
      const isValid = await service.verifyHMAC(data, hmac);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC', async () => {
      // Arrange
      const data = 'Important data';
      const invalidHmac = 'invalid-hmac-value';

      // Act
      const isValid = await service.verifyHMAC(data, invalidHmac);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should reject HMAC for tampered data', async () => {
      // Arrange
      const originalData = 'Original data';
      const hmac = await service.generateHMAC(originalData);
      const tamperedData = 'Tampered data';

      // Act
      const isValid = await service.verifyHMAC(tamperedData, hmac);

      // Assert
      expect(isValid).toBe(false);
    });
  });
});
