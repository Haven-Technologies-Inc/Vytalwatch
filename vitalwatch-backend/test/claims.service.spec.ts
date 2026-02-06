import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClaimsService } from '../src/claims/claims.service';
import { Claim, ClaimStatus, ClaimType } from '../src/claims/entities/claim.entity';
import { BillingService } from '../src/billing/billing.service';
import { AuditService } from '../src/audit/audit.service';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let claimRepository: Repository<Claim>;
  let billingService: BillingService;
  let auditService: AuditService;

  const mockClaimRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };

  const mockBillingService = {
    calculateReimbursement: jest.fn(),
    submitToInsurance: jest.fn(),
    validateCPTCode: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        {
          provide: getRepositoryToken(Claim),
          useValue: mockClaimRepository,
        },
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
    claimRepository = module.get<Repository<Claim>>(getRepositoryToken(Claim));
    billingService = module.get<BillingService>(BillingService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createClaim', () => {
    const createClaimDto = {
      patientId: 'patient-123',
      providerId: 'provider-456',
      type: ClaimType.RPM,
      billingMonth: '2024-01',
      cptCodes: ['99453', '99454', '99457'],
      serviceDate: new Date('2024-01-15'),
      diagnosisCodes: ['I10', 'E11.9'],
      charges: {
        '99453': 19.19,
        '99454': 64.75,
        '99457': 51.08,
      },
    };

    it('should create a new claim successfully', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        ...createClaimDto,
        status: ClaimStatus.DRAFT,
        claimNumber: 'CLM-2024-001',
        totalAmount: 135.02,
        createdAt: new Date(),
      };

      mockClaimRepository.create.mockReturnValue(mockClaim);
      mockClaimRepository.save.mockResolvedValue(mockClaim);
      mockBillingService.validateCPTCode.mockResolvedValue(true);
      mockBillingService.calculateReimbursement.mockResolvedValue(135.02);
      mockAuditService.log.mockResolvedValue(undefined);

      // Act
      const result = await service.createClaim(createClaimDto);

      // Assert
      expect(claimRepository.create).toHaveBeenCalled();
      expect(claimRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(ClaimStatus.DRAFT);
      expect(result.totalAmount).toBe(135.02);
    });

    it('should validate CPT codes before creating claim', async () => {
      // Arrange
      mockBillingService.validateCPTCode.mockResolvedValue(false);

      // Act & Assert
      await expect(service.createClaim(createClaimDto)).rejects.toThrow(BadRequestException);
    });

    it('should generate unique claim number', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        ...createClaimDto,
        claimNumber: 'CLM-2024-001',
      };

      mockClaimRepository.create.mockReturnValue(mockClaim);
      mockClaimRepository.save.mockResolvedValue(mockClaim);
      mockBillingService.validateCPTCode.mockResolvedValue(true);
      mockBillingService.calculateReimbursement.mockResolvedValue(135.02);

      // Act
      const result = await service.createClaim(createClaimDto);

      // Assert
      expect(result.claimNumber).toMatch(/^CLM-\d{4}-\d{3,}$/);
    });
  });

  describe('submitClaim', () => {
    it('should submit a draft claim to insurance', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        status: ClaimStatus.DRAFT,
        patientId: 'patient-123',
        cptCodes: ['99453'],
      };

      const submittedClaim = {
        ...mockClaim,
        status: ClaimStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedBy: 'provider-456',
      };

      mockClaimRepository.findOne.mockResolvedValue(mockClaim);
      mockClaimRepository.save.mockResolvedValue(submittedClaim);
      mockBillingService.submitToInsurance.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
      });

      // Act
      const result = await service.submitClaim('claim-123', 'provider-456');

      // Assert
      expect(result.status).toBe(ClaimStatus.SUBMITTED);
      expect(result.submittedAt).toBeDefined();
      expect(billingService.submitToInsurance).toHaveBeenCalled();
    });

    it('should throw error if claim not in DRAFT status', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        status: ClaimStatus.SUBMITTED,
      };

      mockClaimRepository.findOne.mockResolvedValue(mockClaim);

      // Act & Assert
      await expect(service.submitClaim('claim-123', 'provider-456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateClaimStatus', () => {
    it('should update claim status to APPROVED', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        status: ClaimStatus.SUBMITTED,
        totalAmount: 135.02,
      };

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.APPROVED,
        approvedAmount: 135.02,
        approvedAt: new Date(),
      };

      mockClaimRepository.findOne.mockResolvedValue(mockClaim);
      mockClaimRepository.save.mockResolvedValue(updatedClaim);

      // Act
      const result = await service.updateClaimStatus('claim-123', ClaimStatus.APPROVED, {
        approvedAmount: 135.02,
      });

      // Assert
      expect(result.status).toBe(ClaimStatus.APPROVED);
      expect(result.approvedAmount).toBe(135.02);
    });

    it('should update claim status to DENIED with reason', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        status: ClaimStatus.SUBMITTED,
      };

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.DENIED,
        denialReason: 'Insufficient documentation',
        deniedAt: new Date(),
      };

      mockClaimRepository.findOne.mockResolvedValue(mockClaim);
      mockClaimRepository.save.mockResolvedValue(updatedClaim);

      // Act
      const result = await service.updateClaimStatus('claim-123', ClaimStatus.DENIED, {
        denialReason: 'Insufficient documentation',
      });

      // Assert
      expect(result.status).toBe(ClaimStatus.DENIED);
      expect(result.denialReason).toBe('Insufficient documentation');
    });
  });

  describe('getClaimsByPatient', () => {
    it('should return all claims for a patient', async () => {
      // Arrange
      const mockClaims = [
        {
          id: 'claim-1',
          patientId: 'patient-123',
          status: ClaimStatus.APPROVED,
        },
        {
          id: 'claim-2',
          patientId: 'patient-123',
          status: ClaimStatus.SUBMITTED,
        },
      ];

      mockClaimRepository.find.mockResolvedValue(mockClaims);

      // Act
      const result = await service.getClaimsByPatient('patient-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].patientId).toBe('patient-123');
    });
  });

  describe('getClaimStatistics', () => {
    it('should return claim statistics', async () => {
      // Arrange
      mockClaimRepository.count.mockResolvedValueOnce(100); // total
      mockClaimRepository.count.mockResolvedValueOnce(20); // draft
      mockClaimRepository.count.mockResolvedValueOnce(50); // submitted
      mockClaimRepository.count.mockResolvedValueOnce(25); // approved
      mockClaimRepository.count.mockResolvedValueOnce(5); // denied

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 13500.25 }),
      };

      mockClaimRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getClaimStatistics('2024-01');

      // Assert
      expect(result).toEqual({
        total: 100,
        draft: 20,
        submitted: 50,
        approved: 25,
        denied: 5,
        totalApprovedAmount: 13500.25,
      });
    });
  });

  describe('processClaim', () => {
    it('should process RPM claim with correct CPT codes', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        type: ClaimType.RPM,
        patientId: 'patient-123',
        billingMonth: '2024-01',
        status: ClaimStatus.DRAFT,
      };

      mockClaimRepository.findOne.mockResolvedValue(mockClaim);
      mockBillingService.calculateReimbursement.mockResolvedValue(135.02);

      // Act
      const result = await service.processClaim('claim-123');

      // Assert
      expect(billingService.calculateReimbursement).toHaveBeenCalled();
      expect(result.totalAmount).toBeDefined();
    });
  });

  describe('resubmitClaim', () => {
    it('should resubmit a denied claim with corrections', async () => {
      // Arrange
      const mockClaim = {
        id: 'claim-123',
        status: ClaimStatus.DENIED,
        denialReason: 'Incorrect diagnosis code',
      };

      const corrections = {
        diagnosisCodes: ['I10', 'E11.9'],
      };

      mockClaimRepository.findOne.mockResolvedValue(mockClaim);
      mockClaimRepository.save.mockImplementation((claim) =>
        Promise.resolve({
          ...claim,
          status: ClaimStatus.RESUBMITTED,
          resubmittedAt: new Date(),
        }),
      );

      // Act
      const result = await service.resubmitClaim('claim-123', corrections);

      // Assert
      expect(result.status).toBe(ClaimStatus.RESUBMITTED);
      expect(result.resubmittedAt).toBeDefined();
    });
  });
});
