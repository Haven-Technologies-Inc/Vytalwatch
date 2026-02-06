import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MedicationsService } from '../src/medications/medications.service';
import {
  Medication,
  MedicationStatus,
  MedicationFrequency,
} from '../src/medications/entities/medication.entity';
import {
  MedicationLog,
  LogType,
  AdherenceStatus,
} from '../src/medications/entities/medication-log.entity';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuditService } from '../src/audit/audit.service';

describe('MedicationsService', () => {
  let service: MedicationsService;
  let medicationRepository: Repository<Medication>;
  let medicationLogRepository: Repository<MedicationLog>;
  let notificationsService: NotificationsService;
  let auditService: AuditService;

  const mockMedicationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMedicationLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
    sendPushNotification: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        {
          provide: getRepositoryToken(Medication),
          useValue: mockMedicationRepository,
        },
        {
          provide: getRepositoryToken(MedicationLog),
          useValue: mockMedicationLogRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
    medicationRepository = module.get<Repository<Medication>>(getRepositoryToken(Medication));
    medicationLogRepository = module.get<Repository<MedicationLog>>(
      getRepositoryToken(MedicationLog),
    );
    notificationsService = module.get<NotificationsService>(NotificationsService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createMedicationDto = {
      patientId: 'patient-123',
      prescribedBy: 'provider-456',
      name: 'Metformin',
      dosage: '500mg',
      frequency: MedicationFrequency.TWICE_DAILY,
      route: 'oral',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      instructions: 'Take with meals',
      refills: 3,
    };

    it('should create a new medication successfully', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        ...createMedicationDto,
        status: MedicationStatus.ACTIVE,
        createdAt: new Date(),
      };

      mockMedicationRepository.create.mockReturnValue(mockMedication);
      mockMedicationRepository.save.mockResolvedValue(mockMedication);
      mockAuditService.log.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createMedicationDto);

      // Assert
      expect(medicationRepository.create).toHaveBeenCalled();
      expect(medicationRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(MedicationStatus.ACTIVE);
    });

    it('should schedule medication reminders after creation', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        ...createMedicationDto,
      };

      mockMedicationRepository.create.mockReturnValue(mockMedication);
      mockMedicationRepository.save.mockResolvedValue(mockMedication);

      // Act
      await service.create(createMedicationDto);

      // Assert
      expect(notificationsService.create).toHaveBeenCalled();
    });
  });

  describe('logMedicationTaken', () => {
    it('should log medication as taken', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        name: 'Metformin',
        status: MedicationStatus.ACTIVE,
      };

      const mockLog = {
        id: 'log-123',
        medicationId: 'med-123',
        patientId: 'patient-123',
        type: LogType.TAKEN,
        status: AdherenceStatus.ON_TIME,
        takenAt: new Date(),
        scheduledTime: new Date(),
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);
      mockMedicationLogRepository.create.mockReturnValue(mockLog);
      mockMedicationLogRepository.save.mockResolvedValue(mockLog);

      // Act
      const result = await service.logMedicationTaken('med-123', 'patient-123', {
        takenAt: new Date(),
        notes: 'Taken with breakfast',
      });

      // Assert
      expect(medicationLogRepository.save).toHaveBeenCalled();
      expect(result.type).toBe(LogType.TAKEN);
    });

    it('should mark as late if taken after scheduled time', async () => {
      // Arrange
      const scheduledTime = new Date('2024-01-01T08:00:00Z');
      const takenAt = new Date('2024-01-01T10:00:00Z'); // 2 hours late

      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        status: MedicationStatus.ACTIVE,
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);
      mockMedicationLogRepository.create.mockImplementation((data) => ({
        ...data,
        status: AdherenceStatus.LATE,
      }));
      mockMedicationLogRepository.save.mockImplementation((log) => Promise.resolve(log));

      // Act
      const result = await service.logMedicationTaken('med-123', 'patient-123', {
        takenAt,
        scheduledTime,
      });

      // Assert
      expect(result.status).toBe(AdherenceStatus.LATE);
    });
  });

  describe('logMedicationSkipped', () => {
    it('should log medication as skipped', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        status: MedicationStatus.ACTIVE,
      };

      const mockLog = {
        id: 'log-123',
        medicationId: 'med-123',
        type: LogType.SKIPPED,
        status: AdherenceStatus.SKIPPED,
        reason: 'Forgot',
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);
      mockMedicationLogRepository.create.mockReturnValue(mockLog);
      mockMedicationLogRepository.save.mockResolvedValue(mockLog);

      // Act
      const result = await service.logMedicationSkipped('med-123', 'patient-123', {
        reason: 'Forgot',
        scheduledTime: new Date(),
      });

      // Assert
      expect(result.type).toBe(LogType.SKIPPED);
      expect(result.status).toBe(AdherenceStatus.SKIPPED);
    });
  });

  describe('getAdherenceRate', () => {
    it('should calculate adherence rate correctly', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };

      mockMedicationLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Total logs: 100
      // Taken on time: 75
      // Taken late: 10
      // Skipped: 15
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75) // on time
        .mockResolvedValueOnce(10); // late

      // Act
      const result = await service.getAdherenceRate('patient-123', 'med-123', 30);

      // Assert
      expect(result).toEqual({
        totalDoses: 100,
        takenOnTime: 75,
        takenLate: 10,
        skipped: 15,
        adherenceRate: 85, // (75 + 10) / 100 * 100
      });
    });

    it('should return 0% adherence for no logs', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockMedicationLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getAdherenceRate('patient-123', 'med-123', 30);

      // Assert
      expect(result.adherenceRate).toBe(0);
    });
  });

  describe('discontinueMedication', () => {
    it('should discontinue an active medication', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        status: MedicationStatus.ACTIVE,
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);
      mockMedicationRepository.save.mockResolvedValue({
        ...mockMedication,
        status: MedicationStatus.DISCONTINUED,
        discontinuedAt: new Date(),
        discontinuedBy: 'provider-456',
        discontinuationReason: 'Treatment completed',
      });

      // Act
      const result = await service.discontinueMedication('med-123', 'provider-456', {
        reason: 'Treatment completed',
      });

      // Assert
      expect(result.status).toBe(MedicationStatus.DISCONTINUED);
      expect(result.discontinuationReason).toBe('Treatment completed');
    });
  });

  describe('sendMedicationReminder', () => {
    it('should send push notification for medication reminder', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        name: 'Metformin',
        dosage: '500mg',
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);
      mockNotificationsService.sendPushNotification.mockResolvedValue(undefined);

      // Act
      await service.sendMedicationReminder('med-123');

      // Assert
      expect(notificationsService.sendPushNotification).toHaveBeenCalledWith({
        userId: 'patient-123',
        title: 'Medication Reminder',
        body: expect.stringContaining('Metformin 500mg'),
        data: { medicationId: 'med-123' },
      });
    });
  });

  describe('getPatientMedications', () => {
    it('should return active medications for a patient', async () => {
      // Arrange
      const mockMedications = [
        {
          id: 'med-1',
          patientId: 'patient-123',
          name: 'Metformin',
          status: MedicationStatus.ACTIVE,
        },
        {
          id: 'med-2',
          patientId: 'patient-123',
          name: 'Lisinopril',
          status: MedicationStatus.ACTIVE,
        },
      ];

      mockMedicationRepository.find.mockResolvedValue(mockMedications);

      // Act
      const result = await service.getPatientMedications('patient-123', {
        status: MedicationStatus.ACTIVE,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(MedicationStatus.ACTIVE);
    });
  });

  describe('refillMedication', () => {
    it('should request medication refill', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        name: 'Metformin',
        refills: 2,
        status: MedicationStatus.ACTIVE,
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);
      mockMedicationRepository.save.mockImplementation((med) =>
        Promise.resolve({ ...med, refills: med.refills - 1 }),
      );

      // Act
      const result = await service.refillMedication('med-123', 'patient-123');

      // Assert
      expect(result.refills).toBe(1);
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw error if no refills remaining', async () => {
      // Arrange
      const mockMedication = {
        id: 'med-123',
        patientId: 'patient-123',
        refills: 0,
      };

      mockMedicationRepository.findOne.mockResolvedValue(mockMedication);

      // Act & Assert
      await expect(service.refillMedication('med-123', 'patient-123')).rejects.toThrow();
    });
  });
});
