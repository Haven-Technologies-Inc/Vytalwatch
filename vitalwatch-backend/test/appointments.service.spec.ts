import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from '../src/appointments/appointments.service';
import {
  Appointment,
  AppointmentType,
  AppointmentStatus,
} from '../src/appointments/entities/appointment.entity';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuditService } from '../src/audit/audit.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentRepository: Repository<Appointment>;
  let notificationsService: NotificationsService;
  let auditService: AuditService;

  const mockAppointmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
    sendEmail: jest.fn(),
    sendSMS: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentRepository,
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

    service = module.get<AppointmentsService>(AppointmentsService);
    appointmentRepository = module.get<Repository<Appointment>>(getRepositoryToken(Appointment));
    notificationsService = module.get<NotificationsService>(NotificationsService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAppointmentDto = {
      patientId: 'patient-123',
      providerId: 'provider-456',
      type: AppointmentType.TELEHEALTH,
      scheduledAt: new Date('2024-12-31T10:00:00Z'),
      duration: 30,
      reason: 'Follow-up consultation',
      notes: 'Check blood pressure',
    };

    it('should create a new appointment successfully', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        ...createAppointmentDto,
        status: AppointmentStatus.SCHEDULED,
        createdAt: new Date(),
      };

      mockAppointmentRepository.create.mockReturnValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue(mockAppointment);
      mockAuditService.log.mockResolvedValue(undefined);

      // Mock no conflicts
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockAppointmentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.create(createAppointmentDto);

      // Assert
      expect(appointmentRepository.create).toHaveBeenCalled();
      expect(appointmentRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
    });

    it('should throw ConflictException if time slot not available', async () => {
      // Arrange
      const conflictingAppointment = {
        id: 'existing-appt',
        providerId: 'provider-456',
        scheduledAt: new Date('2024-12-31T10:00:00Z'),
        status: AppointmentStatus.SCHEDULED,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(conflictingAppointment),
      };
      mockAppointmentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.create(createAppointmentDto)).rejects.toThrow(ConflictException);
    });

    it('should send notifications to patient and provider', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        ...createAppointmentDto,
        status: AppointmentStatus.SCHEDULED,
      };

      mockAppointmentRepository.create.mockReturnValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue(mockAppointment);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockAppointmentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.create(createAppointmentDto);

      // Assert
      expect(notificationsService.create).toHaveBeenCalledTimes(2); // Patient and provider
    });

    it('should throw error if appointment scheduled in the past', async () => {
      // Arrange
      const pastAppointment = {
        ...createAppointmentDto,
        scheduledAt: new Date('2020-01-01T10:00:00Z'),
      };

      // Act & Assert
      await expect(service.create(pastAppointment)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reschedule', () => {
    it('should reschedule an appointment', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
        scheduledAt: new Date('2024-12-31T10:00:00Z'),
        status: AppointmentStatus.SCHEDULED,
      };

      const newScheduledAt = new Date('2025-01-15T14:00:00Z');

      mockAppointmentRepository.findOne.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue({
        ...mockAppointment,
        scheduledAt: newScheduledAt,
        rescheduledAt: new Date(),
        rescheduledBy: 'patient-123',
      });

      // Mock no conflicts
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockAppointmentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.reschedule('appt-123', 'patient-123', {
        newScheduledAt,
        reason: 'Schedule conflict',
      });

      // Assert
      expect(result.scheduledAt).toEqual(newScheduledAt);
      expect(result.rescheduledAt).toBeDefined();
    });

    it('should throw error if rescheduling within 24 hours', async () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 12); // 12 hours from now

      const mockAppointment = {
        id: 'appt-123',
        scheduledAt: tomorrow,
        status: AppointmentStatus.SCHEDULED,
      };

      mockAppointmentRepository.findOne.mockResolvedValue(mockAppointment);

      // Act & Assert
      await expect(
        service.reschedule('appt-123', 'patient-123', {
          newScheduledAt: new Date('2025-01-15T14:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel an appointment', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        patientId: 'patient-123',
        status: AppointmentStatus.SCHEDULED,
      };

      mockAppointmentRepository.findOne.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue({
        ...mockAppointment,
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'patient-123',
        cancellationReason: 'Personal reasons',
      });

      // Act
      const result = await service.cancel('appt-123', 'patient-123', {
        reason: 'Personal reasons',
      });

      // Assert
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Personal reasons');
    });
  });

  describe('checkIn', () => {
    it('should check in a patient for appointment', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        patientId: 'patient-123',
        status: AppointmentStatus.SCHEDULED,
      };

      mockAppointmentRepository.findOne.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue({
        ...mockAppointment,
        status: AppointmentStatus.CHECKED_IN,
        checkedInAt: new Date(),
      });

      // Act
      const result = await service.checkIn('appt-123', 'patient-123');

      // Assert
      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(result.checkedInAt).toBeDefined();
    });

    it('should not allow early check-in beyond allowed window', async () => {
      // Arrange
      const futureAppointment = new Date();
      futureAppointment.setHours(futureAppointment.getHours() + 2); // 2 hours in future

      const mockAppointment = {
        id: 'appt-123',
        patientId: 'patient-123',
        scheduledAt: futureAppointment,
        status: AppointmentStatus.SCHEDULED,
      };

      mockAppointmentRepository.findOne.mockResolvedValue(mockAppointment);

      // Act & Assert
      await expect(service.checkIn('appt-123', 'patient-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should mark appointment as completed', async () => {
      // Arrange
      const mockAppointment = {
        id: 'appt-123',
        providerId: 'provider-456',
        status: AppointmentStatus.IN_PROGRESS,
      };

      mockAppointmentRepository.findOne.mockResolvedValue(mockAppointment);
      mockAppointmentRepository.save.mockResolvedValue({
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
        notes: 'Patient doing well',
      });

      // Act
      const result = await service.complete('appt-123', 'provider-456', {
        notes: 'Patient doing well',
      });

      // Assert
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('getUpcomingAppointments', () => {
    it('should return upcoming appointments for a patient', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: 'appt-1',
          patientId: 'patient-123',
          scheduledAt: new Date('2024-12-31T10:00:00Z'),
          status: AppointmentStatus.SCHEDULED,
        },
        {
          id: 'appt-2',
          patientId: 'patient-123',
          scheduledAt: new Date('2025-01-15T14:00:00Z'),
          status: AppointmentStatus.SCHEDULED,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAppointments),
      };

      mockAppointmentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getUpcomingAppointments('patient-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(AppointmentStatus.SCHEDULED);
    });
  });

  describe('sendReminders', () => {
    it('should send reminders for appointments in next 24 hours', async () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockAppointments = [
        {
          id: 'appt-1',
          patientId: 'patient-123',
          providerId: 'provider-456',
          scheduledAt: tomorrow,
          status: AppointmentStatus.SCHEDULED,
        },
      ];

      mockAppointmentRepository.find.mockResolvedValue(mockAppointments);
      mockAppointmentRepository.save.mockImplementation((appt) =>
        Promise.resolve({ ...appt, reminderSent: true }),
      );

      // Act
      await service.sendReminders();

      // Assert
      expect(notificationsService.sendEmail).toHaveBeenCalled();
      expect(notificationsService.sendSMS).toHaveBeenCalled();
    });
  });

  describe('getProviderAvailability', () => {
    it('should return available time slots for a provider', async () => {
      // Arrange
      const date = new Date('2024-12-31');
      const existingAppointments = [
        {
          id: 'appt-1',
          providerId: 'provider-456',
          scheduledAt: new Date('2024-12-31T10:00:00Z'),
          duration: 30,
          status: AppointmentStatus.SCHEDULED,
        },
      ];

      mockAppointmentRepository.find.mockResolvedValue(existingAppointments);

      // Act
      const result = await service.getProviderAvailability('provider-456', date);

      // Assert
      expect(result).toBeDefined();
      expect(result.availableSlots).toBeDefined();
      expect(result.bookedSlots).toHaveLength(1);
    });
  });
});
