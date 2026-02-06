import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ConsentsService } from '../src/consents/consents.service';
import { Consent, ConsentType, ConsentStatus } from '../src/consents/entities/consent.entity';
import { AuditService } from '../src/audit/audit.service';

describe('ConsentsService', () => {
  let service: ConsentsService;
  let consentRepository: Repository<Consent>;
  let auditService: AuditService;

  const mockConsentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        {
          provide: getRepositoryToken(Consent),
          useValue: mockConsentRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
    consentRepository = module.get<Repository<Consent>>(getRepositoryToken(Consent));
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createConsentDto = {
      patientId: 'patient-123',
      type: ConsentType.HIPAA,
      version: '1.0',
      documentUrl: 'https://example.com/consent.pdf',
      metadata: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    };

    it('should create a new consent successfully', async () => {
      // Arrange
      const mockConsent = {
        id: 'consent-123',
        ...createConsentDto,
        status: ConsentStatus.PENDING,
        createdAt: new Date(),
      };

      mockConsentRepository.findOne.mockResolvedValue(null);
      mockConsentRepository.create.mockReturnValue(mockConsent);
      mockConsentRepository.save.mockResolvedValue(mockConsent);
      mockAuditService.log.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createConsentDto);

      // Assert
      expect(consentRepository.create).toHaveBeenCalled();
      expect(consentRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith({
        action: 'CONSENT_CREATED',
        userId: createConsentDto.patientId,
        resourceType: 'consent',
        resourceId: mockConsent.id,
        details: expect.any(Object),
      });
      expect(result).toEqual(mockConsent);
    });

    it('should throw ConflictException if active consent already exists', async () => {
      // Arrange
      const existingConsent = {
        id: 'existing-consent',
        patientId: 'patient-123',
        type: ConsentType.HIPAA,
        status: ConsentStatus.ACTIVE,
      };

      mockConsentRepository.findOne.mockResolvedValue(existingConsent);

      // Act & Assert
      await expect(service.create(createConsentDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('grantConsent', () => {
    it('should grant consent and mark as active', async () => {
      // Arrange
      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        status: ConsentStatus.PENDING,
        grantedAt: null,
        signatureData: null,
      };

      const signatureData = {
        signature: 'base64-signature-data',
        signedAt: new Date(),
      };

      mockConsentRepository.findOne.mockResolvedValue(mockConsent);
      mockConsentRepository.save.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.ACTIVE,
        grantedAt: new Date(),
        signatureData,
      });

      // Act
      const result = await service.grantConsent('consent-123', 'patient-123', signatureData);

      // Assert
      expect(result.status).toBe(ConsentStatus.ACTIVE);
      expect(result.grantedAt).toBeDefined();
      expect(result.signatureData).toEqual(signatureData);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if consent not found', async () => {
      // Arrange
      mockConsentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.grantConsent('non-existent', 'patient-123', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeConsent', () => {
    it('should revoke an active consent', async () => {
      // Arrange
      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        status: ConsentStatus.ACTIVE,
        revokedAt: null,
      };

      mockConsentRepository.findOne.mockResolvedValue(mockConsent);
      mockConsentRepository.save.mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: 'Patient request',
      });

      // Act
      const result = await service.revokeConsent('consent-123', 'patient-123', 'Patient request');

      // Assert
      expect(result.status).toBe(ConsentStatus.REVOKED);
      expect(result.revokedAt).toBeDefined();
      expect(result.revocationReason).toBe('Patient request');
    });
  });

  describe('checkConsentStatus', () => {
    it('should return true if active consent exists', async () => {
      // Arrange
      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        type: ConsentType.HIPAA,
        status: ConsentStatus.ACTIVE,
      };

      mockConsentRepository.findOne.mockResolvedValue(mockConsent);

      // Act
      const result = await service.checkConsentStatus('patient-123', ConsentType.HIPAA);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if no active consent exists', async () => {
      // Arrange
      mockConsentRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkConsentStatus('patient-123', ConsentType.HIPAA);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getPatientConsents', () => {
    it('should return all consents for a patient', async () => {
      // Arrange
      const mockConsents = [
        {
          id: 'consent-1',
          patientId: 'patient-123',
          type: ConsentType.HIPAA,
          status: ConsentStatus.ACTIVE,
        },
        {
          id: 'consent-2',
          patientId: 'patient-123',
          type: ConsentType.TELEHEALTH,
          status: ConsentStatus.ACTIVE,
        },
      ];

      mockConsentRepository.find.mockResolvedValue(mockConsents);

      // Act
      const result = await service.getPatientConsents('patient-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockConsents);
    });
  });

  describe('expireConsents', () => {
    it('should mark expired consents as EXPIRED', async () => {
      // Arrange
      const expiredConsents = [
        {
          id: 'consent-1',
          patientId: 'patient-123',
          expiresAt: new Date(Date.now() - 86400000), // Yesterday
          status: ConsentStatus.ACTIVE,
        },
      ];

      mockConsentRepository.find.mockResolvedValue(expiredConsents);
      mockConsentRepository.save.mockImplementation((consent) =>
        Promise.resolve({ ...consent, status: ConsentStatus.EXPIRED }),
      );

      // Act
      await service.expireConsents();

      // Assert
      expect(consentRepository.save).toHaveBeenCalled();
    });
  });

  describe('validateConsent', () => {
    it('should validate all consent requirements', async () => {
      // Arrange
      const requiredTypes = [ConsentType.HIPAA, ConsentType.TELEHEALTH, ConsentType.RPM];

      mockConsentRepository.findOne.mockImplementation(({ where }) => {
        return Promise.resolve({
          id: `consent-${where.type}`,
          patientId: 'patient-123',
          type: where.type,
          status: ConsentStatus.ACTIVE,
        });
      });

      // Act
      const result = await service.validateConsent('patient-123', requiredTypes);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.missingConsents).toHaveLength(0);
    });

    it('should identify missing consents', async () => {
      // Arrange
      const requiredTypes = [ConsentType.HIPAA, ConsentType.TELEHEALTH, ConsentType.RPM];

      mockConsentRepository.findOne.mockImplementation(({ where }) => {
        if (where.type === ConsentType.HIPAA) {
          return Promise.resolve({
            id: 'consent-hipaa',
            type: ConsentType.HIPAA,
            status: ConsentStatus.ACTIVE,
          });
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await service.validateConsent('patient-123', requiredTypes);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingConsents).toHaveLength(2);
      expect(result.missingConsents).toContain(ConsentType.TELEHEALTH);
      expect(result.missingConsents).toContain(ConsentType.RPM);
    });
  });
});
