import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClinicalNotesService } from '../src/clinical-notes/clinical-notes.service';
import {
  ClinicalNote,
  NoteType,
  NoteStatus,
} from '../src/clinical-notes/entities/clinical-note.entity';
import { EncryptionService } from '../src/encryption/encryption.service';
import { AuditService } from '../src/audit/audit.service';

describe('ClinicalNotesService', () => {
  let service: ClinicalNotesService;
  let clinicalNoteRepository: Repository<ClinicalNote>;
  let encryptionService: EncryptionService;
  let auditService: AuditService;

  const mockClinicalNoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalNotesService,
        {
          provide: getRepositoryToken(ClinicalNote),
          useValue: mockClinicalNoteRepository,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ClinicalNotesService>(ClinicalNotesService);
    clinicalNoteRepository = module.get<Repository<ClinicalNote>>(
      getRepositoryToken(ClinicalNote),
    );
    encryptionService = module.get<EncryptionService>(EncryptionService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createNoteDto = {
      patientId: 'patient-123',
      encounterId: 'encounter-456',
      type: NoteType.SOAP,
      title: 'Follow-up Visit',
      content: {
        subjective: 'Patient reports feeling better',
        objective: 'BP: 120/80, HR: 72',
        assessment: 'Hypertension controlled',
        plan: 'Continue current medication',
      },
      chiefComplaint: 'Follow-up for hypertension',
      diagnosis: ['I10'],
      procedures: [],
      medications: ['Lisinopril 10mg'],
      vitalSigns: {
        bloodPressure: '120/80',
        heartRate: 72,
        temperature: 98.6,
      },
    };

    it('should create and encrypt a clinical note', async () => {
      // Arrange
      const encryptedContent = JSON.stringify({
        version: 1,
        iv: 'test-iv',
        authTag: 'test-tag',
        ciphertext: 'encrypted-data',
      });

      mockEncryptionService.encrypt.mockResolvedValue(encryptedContent);

      const mockNote = {
        id: 'note-123',
        ...createNoteDto,
        encryptedContent,
        status: NoteStatus.DRAFT,
        createdAt: new Date(),
        createdBy: 'provider-456',
      };

      mockClinicalNoteRepository.create.mockReturnValue(mockNote);
      mockClinicalNoteRepository.save.mockResolvedValue(mockNote);
      mockAuditService.log.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createNoteDto, 'provider-456');

      // Assert
      expect(encryptionService.encrypt).toHaveBeenCalledWith(JSON.stringify(createNoteDto.content));
      expect(clinicalNoteRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(NoteStatus.DRAFT);
    });

    it('should create audit log after note creation', async () => {
      // Arrange
      mockEncryptionService.encrypt.mockResolvedValue('encrypted-data');
      mockClinicalNoteRepository.create.mockReturnValue({ id: 'note-123' });
      mockClinicalNoteRepository.save.mockResolvedValue({ id: 'note-123' });

      // Act
      await service.create(createNoteDto, 'provider-456');

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        action: 'CLINICAL_NOTE_CREATED',
        userId: 'provider-456',
        resourceType: 'clinical_note',
        resourceId: 'note-123',
        details: expect.any(Object),
      });
    });
  });

  describe('findById', () => {
    it('should return and decrypt a clinical note', async () => {
      // Arrange
      const encryptedContent = 'encrypted-data';
      const decryptedContent = {
        subjective: 'Patient reports feeling better',
        objective: 'BP: 120/80',
        assessment: 'Hypertension controlled',
        plan: 'Continue medication',
      };

      const mockNote = {
        id: 'note-123',
        patientId: 'patient-123',
        encryptedContent,
        createdBy: 'provider-456',
      };

      mockClinicalNoteRepository.findOne.mockResolvedValue(mockNote);
      mockEncryptionService.decrypt.mockResolvedValue(JSON.stringify(decryptedContent));

      // Act
      const result = await service.findById('note-123');

      // Assert
      expect(encryptionService.decrypt).toHaveBeenCalledWith(encryptedContent);
      expect(result.content).toEqual(decryptedContent);
    });

    it('should throw NotFoundException if note not found', async () => {
      // Arrange
      mockClinicalNoteRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateNoteDto = {
      title: 'Updated Title',
      content: {
        subjective: 'Updated subjective',
        objective: 'Updated objective',
        assessment: 'Updated assessment',
        plan: 'Updated plan',
      },
    };

    it('should update and re-encrypt note content', async () => {
      // Arrange
      const existingNote = {
        id: 'note-123',
        patientId: 'patient-123',
        createdBy: 'provider-456',
        status: NoteStatus.DRAFT,
        encryptedContent: 'old-encrypted-data',
      };

      const newEncryptedContent = 'new-encrypted-data';

      mockClinicalNoteRepository.findOne.mockResolvedValue(existingNote);
      mockEncryptionService.encrypt.mockResolvedValue(newEncryptedContent);
      mockClinicalNoteRepository.save.mockResolvedValue({
        ...existingNote,
        ...updateNoteDto,
        encryptedContent: newEncryptedContent,
      });

      // Act
      const result = await service.update('note-123', 'provider-456', updateNoteDto);

      // Assert
      expect(encryptionService.encrypt).toHaveBeenCalled();
      expect(clinicalNoteRepository.save).toHaveBeenCalled();
      expect(result.title).toBe(updateNoteDto.title);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      // Arrange
      const existingNote = {
        id: 'note-123',
        createdBy: 'provider-456',
        status: NoteStatus.DRAFT,
      };

      mockClinicalNoteRepository.findOne.mockResolvedValue(existingNote);

      // Act & Assert
      await expect(
        service.update('note-123', 'different-provider', updateNoteDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow updates to signed notes', async () => {
      // Arrange
      const signedNote = {
        id: 'note-123',
        createdBy: 'provider-456',
        status: NoteStatus.SIGNED,
      };

      mockClinicalNoteRepository.findOne.mockResolvedValue(signedNote);

      // Act & Assert
      await expect(service.update('note-123', 'provider-456', updateNoteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('signNote', () => {
    it('should sign a draft note', async () => {
      // Arrange
      const mockNote = {
        id: 'note-123',
        createdBy: 'provider-456',
        status: NoteStatus.DRAFT,
      };

      mockClinicalNoteRepository.findOne.mockResolvedValue(mockNote);
      mockClinicalNoteRepository.save.mockResolvedValue({
        ...mockNote,
        status: NoteStatus.SIGNED,
        signedAt: new Date(),
        signedBy: 'provider-456',
        signature: 'digital-signature',
      });

      // Act
      const result = await service.signNote('note-123', 'provider-456', {
        signature: 'digital-signature',
      });

      // Assert
      expect(result.status).toBe(NoteStatus.SIGNED);
      expect(result.signedAt).toBeDefined();
      expect(result.signature).toBe('digital-signature');
    });

    it('should not allow signing by non-author', async () => {
      // Arrange
      const mockNote = {
        id: 'note-123',
        createdBy: 'provider-456',
        status: NoteStatus.DRAFT,
      };

      mockClinicalNoteRepository.findOne.mockResolvedValue(mockNote);

      // Act & Assert
      await expect(
        service.signNote('note-123', 'different-provider', { signature: 'sig' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addendumNote', () => {
    it('should create an addendum to a signed note', async () => {
      // Arrange
      const originalNote = {
        id: 'note-123',
        status: NoteStatus.SIGNED,
        patientId: 'patient-123',
      };

      const addendumContent = 'Additional information added after signing';

      mockClinicalNoteRepository.findOne.mockResolvedValue(originalNote);
      mockEncryptionService.encrypt.mockResolvedValue('encrypted-addendum');

      const addendumNote = {
        id: 'addendum-123',
        type: NoteType.ADDENDUM,
        parentNoteId: 'note-123',
        encryptedContent: 'encrypted-addendum',
        status: NoteStatus.DRAFT,
      };

      mockClinicalNoteRepository.create.mockReturnValue(addendumNote);
      mockClinicalNoteRepository.save.mockResolvedValue(addendumNote);

      // Act
      const result = await service.addendumNote('note-123', 'provider-456', {
        content: addendumContent,
      });

      // Assert
      expect(result.type).toBe(NoteType.ADDENDUM);
      expect(result.parentNoteId).toBe('note-123');
    });
  });

  describe('getPatientNotes', () => {
    it('should return all notes for a patient', async () => {
      // Arrange
      const mockNotes = [
        {
          id: 'note-1',
          patientId: 'patient-123',
          type: NoteType.SOAP,
          status: NoteStatus.SIGNED,
          encryptedContent: 'encrypted-1',
        },
        {
          id: 'note-2',
          patientId: 'patient-123',
          type: NoteType.PROGRESS,
          status: NoteStatus.SIGNED,
          encryptedContent: 'encrypted-2',
        },
      ];

      mockClinicalNoteRepository.find.mockResolvedValue(mockNotes);
      mockEncryptionService.decrypt.mockResolvedValue(
        JSON.stringify({ subjective: 'test' }),
      );

      // Act
      const result = await service.getPatientNotes('patient-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].content).toBeDefined();
    });
  });

  describe('searchNotes', () => {
    it('should search notes by keyword', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'note-1',
              encryptedContent: 'encrypted',
            },
          ],
          1,
        ]),
      };

      mockClinicalNoteRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockEncryptionService.decrypt.mockResolvedValue(
        JSON.stringify({ subjective: 'hypertension' }),
      );

      // Act
      const result = await service.searchNotes({
        keyword: 'hypertension',
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.notes).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('generateNoteTemplate', () => {
    it('should generate a SOAP note template', async () => {
      // Arrange & Act
      const result = await service.generateNoteTemplate(NoteType.SOAP);

      // Assert
      expect(result).toHaveProperty('subjective');
      expect(result).toHaveProperty('objective');
      expect(result).toHaveProperty('assessment');
      expect(result).toHaveProperty('plan');
    });

    it('should generate a Progress note template', async () => {
      // Arrange & Act
      const result = await service.generateNoteTemplate(NoteType.PROGRESS);

      // Assert
      expect(result).toHaveProperty('progressNotes');
      expect(result).toHaveProperty('currentStatus');
    });
  });

  describe('exportNote', () => {
    it('should export note in specified format', async () => {
      // Arrange
      const mockNote = {
        id: 'note-123',
        type: NoteType.SOAP,
        encryptedContent: 'encrypted',
        createdAt: new Date(),
      };

      const decryptedContent = {
        subjective: 'Patient reports improvement',
        objective: 'BP: 120/80',
        assessment: 'Stable',
        plan: 'Continue treatment',
      };

      mockClinicalNoteRepository.findOne.mockResolvedValue(mockNote);
      mockEncryptionService.decrypt.mockResolvedValue(JSON.stringify(decryptedContent));

      // Act
      const result = await service.exportNote('note-123', 'pdf');

      // Assert
      expect(result).toBeDefined();
      expect(result.format).toBe('pdf');
      expect(result.content).toBeDefined();
    });
  });
});
