import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService, PHI_FIELDS } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-encryption-key-32-characters'),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    service.onModuleInit();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Sensitive PHI data';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      expect(service.encrypt('')).toBe('');
      expect(service.decrypt('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(service.encrypt(null as any)).toBeFalsy();
      expect(service.decrypt(null as any)).toBeFalsy();
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Test data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const data = '123-45-6789';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = service.hash('123-45-6789');
      const hash2 = service.hash('987-65-4321');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('encryptPHI/decryptPHI', () => {
    it('should encrypt specified PHI fields', () => {
      const patient = {
        id: '123',
        name: 'John Doe',
        ssn: '123-45-6789',
        dateOfBirth: '1990-01-01',
      };

      const encrypted = service.encryptPHI(patient, ['ssn', 'dateOfBirth']);

      expect(encrypted.id).toBe('123');
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.ssn).not.toBe('123-45-6789');
      expect(encrypted.dateOfBirth).not.toBe('1990-01-01');

      const decrypted = service.decryptPHI(encrypted, ['ssn', 'dateOfBirth']);
      expect(decrypted.ssn).toBe('123-45-6789');
      expect(decrypted.dateOfBirth).toBe('1990-01-01');
    });
  });

  describe('generateToken', () => {
    it('should generate token of specified length', () => {
      const token = service.generateToken(16);
      expect(token).toHaveLength(32); // hex encoding doubles length
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('password hashing', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'SecureP@ssword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toContain(':');
      expect(await service.verifyPassword(password, hash)).toBe(true);
      expect(await service.verifyPassword('WrongPassword', hash)).toBe(false);
    });
  });
});
