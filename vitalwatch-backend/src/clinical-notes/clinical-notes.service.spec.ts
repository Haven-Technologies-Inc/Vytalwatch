import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNote, NoteType, EncounterType, NoteStatus } from './entities/clinical-note.entity';
import { AuditService } from '../audit/audit.service';
import { AIService } from '../ai/ai.service';

describe('ClinicalNotesService', () => {
  let service: ClinicalNotesService;
  let repository: Repository<ClinicalNote>;
  let auditService: AuditService;
  let aiService: AIService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockAIService = {
    chatWithAI: jest.fn().mockResolvedValue('AI-generated content'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalNotesService,
        {
          provide: getRepositoryToken(ClinicalNote),
          useValue: mockRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
      ],
    }).compile();

    service = module.get<ClinicalNotesService>(ClinicalNotesService);
    repository = module.get<Repository<ClinicalNote>>(getRepositoryToken(ClinicalNote));
    auditService = module.get<AuditService>(AuditService);
    aiService = module.get<AIService>(AIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new clinical note', async () => {
      const createDto = {
        patientId: 'patient-123',
        providerId: 'provider-123',
        noteType: NoteType.SOAP,
        encounterType: EncounterType.TELEHEALTH,
        encounterDate: new Date(),
        title: 'Test Note',
        content: 'Test content',
      };

      const expectedNote = {
        id: 'note-123',
        ...createDto,
        status: NoteStatus.DRAFT,
      };

      mockRepository.create.mockReturnValue(expectedNote);
      mockRepository.save.mockResolvedValue(expectedNote);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedNote);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: NoteStatus.DRAFT,
        encounterDate: createDto.encounterDate,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(expectedNote);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        action: 'CLINICAL_NOTE_CREATED',
        userId: createDto.providerId,
        resourceType: 'clinical_note',
        resourceId: expectedNote.id,
        details: {
          patientId: createDto.patientId,
          noteType: createDto.noteType,
          encounterType: createDto.encounterType,
        },
      });
    });
  });

  describe('findById', () => {
    it('should find a note by ID', async () => {
      const noteId = 'note-123';
      const expectedNote = {
        id: noteId,
        patientId: 'patient-123',
        providerId: 'provider-123',
        noteType: NoteType.SOAP,
        status: NoteStatus.DRAFT,
        deletedAt: null,
      };

      mockRepository.findOne.mockResolvedValue(expectedNote);

      const result = await service.findById(noteId);

      expect(result).toEqual(expectedNote);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: noteId, deletedAt: expect.anything() },
        relations: ['patient', 'provider'],
      });
    });

    it('should return null if note not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw ForbiddenException for confidential note without access', async () => {
      const note = {
        id: 'note-123',
        patientId: 'patient-123',
        providerId: 'provider-123',
        isConfidential: true,
        accessibleTo: [],
      };

      mockRepository.findOne.mockResolvedValue(note);

      await expect(service.findById('note-123', 'unauthorized-user')).rejects.toThrow();
    });
  });

  describe('sign', () => {
    it('should sign a note with digital signature', async () => {
      const noteId = 'note-123';
      const userId = 'provider-123';
      const signDto = {
        signatureMethod: 'electronic' as const,
        password: 'test-password',
      };

      const note = {
        id: noteId,
        providerId: userId,
        title: 'Test Note',
        content: 'Test content',
        encounterDate: new Date(),
        isSigned: false,
        noteType: NoteType.SOAP,
        structuredData: {
          subjective: {},
          objective: {},
          assessment: {},
          plan: {},
        },
      };

      mockRepository.findOne.mockResolvedValue(note);
      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.sign(noteId, signDto, userId);

      expect(result.isSigned).toBe(true);
      expect(result.status).toBe(NoteStatus.SIGNED);
      expect(result.signature).toBeDefined();
      expect(result.signature.signedBy).toBe(userId);
      expect(result.signature.signatureMethod).toBe('electronic');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CLINICAL_NOTE_SIGNED',
          userId,
          resourceType: 'clinical_note',
          resourceId: noteId,
        }),
      );
    });

    it('should throw BadRequestException if note is already signed', async () => {
      const note = {
        id: 'note-123',
        providerId: 'provider-123',
        isSigned: true,
      };

      mockRepository.findOne.mockResolvedValue(note);

      await expect(
        service.sign('note-123', { signatureMethod: 'electronic' }, 'provider-123'),
      ).rejects.toThrow('Note is already signed');
    });

    it('should throw ForbiddenException if user is not the note author', async () => {
      const note = {
        id: 'note-123',
        providerId: 'provider-123',
        isSigned: false,
        title: 'Test',
        content: 'Test',
        encounterDate: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(note);

      await expect(
        service.sign('note-123', { signatureMethod: 'electronic' }, 'different-provider'),
      ).rejects.toThrow('Only the note author can sign it');
    });
  });

  describe('amend', () => {
    it('should amend a signed note', async () => {
      const noteId = 'note-123';
      const amendDto = {
        amendedBy: 'provider-123',
        reason: 'Correction needed',
        changes: [
          {
            field: 'content',
            oldValue: 'Old content',
            newValue: 'New content',
          },
        ],
      };

      const note = {
        id: noteId,
        providerId: 'provider-123',
        isSigned: true,
        isLocked: false,
        content: 'Old content',
        amendments: [],
      };

      mockRepository.findOne.mockResolvedValue(note);
      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.amend(noteId, amendDto);

      expect(result.isAmended).toBe(true);
      expect(result.amendments).toHaveLength(1);
      expect(result.amendments[0].reason).toBe(amendDto.reason);
      expect(result.content).toBe('New content');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CLINICAL_NOTE_AMENDED',
          userId: amendDto.amendedBy,
        }),
      );
    });

    it('should throw BadRequestException for unsigned notes', async () => {
      const note = {
        id: 'note-123',
        isSigned: false,
        isLocked: false,
      };

      mockRepository.findOne.mockResolvedValue(note);

      await expect(
        service.amend('note-123', {
          amendedBy: 'provider-123',
          reason: 'Test',
          changes: [],
        }),
      ).rejects.toThrow('Only signed or locked notes can be amended');
    });
  });

  describe('search', () => {
    it('should search notes with filters', async () => {
      const searchDto = {
        patientId: 'patient-123',
        noteType: NoteType.SOAP,
        page: 1,
        limit: 50,
      };

      const expectedNotes = [
        { id: 'note-1', patientId: 'patient-123', noteType: NoteType.SOAP },
        { id: 'note-2', patientId: 'patient-123', noteType: NoteType.SOAP },
      ];

      mockRepository.createQueryBuilder().getManyAndCount.mockResolvedValue([expectedNotes, 2]);

      const result = await service.search(searchDto);

      expect(result.notes).toEqual(expectedNotes);
      expect(result.total).toBe(2);
    });
  });

  describe('getTemplates', () => {
    it('should return all templates', () => {
      const templates = service.getTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('noteType');
    });

    it('should filter templates by note type', () => {
      const templates = service.getTemplates(NoteType.SOAP);

      expect(templates).toBeDefined();
      expect(templates.every((t) => t.noteType === NoteType.SOAP)).toBe(true);
    });
  });

  describe('lock', () => {
    it('should lock a signed note', async () => {
      const noteId = 'note-123';
      const userId = 'provider-123';

      const note = {
        id: noteId,
        isSigned: true,
        isLocked: false,
      };

      mockRepository.findOne.mockResolvedValue(note);
      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.lock(noteId, userId);

      expect(result.isLocked).toBe(true);
      expect(result.lockedBy).toBe(userId);
      expect(result.status).toBe(NoteStatus.LOCKED);
    });

    it('should throw BadRequestException if note is not signed', async () => {
      const note = {
        id: 'note-123',
        isSigned: false,
      };

      mockRepository.findOne.mockResolvedValue(note);

      await expect(service.lock('note-123', 'provider-123')).rejects.toThrow(
        'Only signed notes can be locked',
      );
    });
  });
});
