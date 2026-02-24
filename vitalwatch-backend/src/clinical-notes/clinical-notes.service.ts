import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ClinicalNote, CommunicationLog, NoteStatus, NoteType } from './entities/clinical-note.entity';
import {
  CreateClinicalNoteDto,
  UpdateClinicalNoteDto,
  SignNoteDto,
  AmendNoteDto,
  CreateCommunicationLogDto,
  NoteFilterDto,
} from './dto/clinical-note.dto';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ClinicalNotesService {
  private readonly logger = new Logger(ClinicalNotesService.name);

  constructor(
    @InjectRepository(ClinicalNote)
    private readonly noteRepository: Repository<ClinicalNote>,
    @InjectRepository(CommunicationLog)
    private readonly commLogRepository: Repository<CommunicationLog>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateClinicalNoteDto, user: CurrentUserPayload): Promise<ClinicalNote> {
    const note = this.noteRepository.create({
      ...dto,
      providerId: user.sub,
      organizationId: user.organizationId,
      status: NoteStatus.DRAFT,
    });

    const saved = await this.noteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_CREATED',
      userId: user.sub,
      resourceType: 'clinical_note',
      resourceId: saved.id,
      details: { patientId: dto.patientId, type: dto.type },
    });

    this.logger.log(`Clinical note created: ${saved.id} for patient ${dto.patientId}`);
    return saved;
  }

  async findAll(filters: NoteFilterDto, user: CurrentUserPayload) {
    const { page = 1, limit = 20, patientId, providerId, type, status, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const query = this.noteRepository.createQueryBuilder('note')
      .leftJoinAndSelect('note.patient', 'patient')
      .leftJoinAndSelect('note.provider', 'provider');

    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN) {
      query.andWhere('note.organizationId = :orgId', { orgId: user.organizationId });
    }

    if (patientId) {
      query.andWhere('note.patientId = :patientId', { patientId });
    }

    if (providerId) {
      query.andWhere('note.providerId = :providerId', { providerId });
    }

    if (type) {
      query.andWhere('note.type = :type', { type });
    }

    if (status) {
      query.andWhere('note.status = :status', { status });
    }

    if (startDate) {
      query.andWhere('note.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      query.andWhere('note.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    query.orderBy('note.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [notes, total] = await query.getManyAndCount();

    return {
      data: notes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: CurrentUserPayload): Promise<ClinicalNote> {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['patient', 'provider', 'signer'],
    });

    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    this.checkAccess(note, user);
    return note;
  }

  async findByPatient(patientId: string, user: CurrentUserPayload, limit = 50) {
    const query = this.noteRepository.createQueryBuilder('note')
      .leftJoinAndSelect('note.provider', 'provider')
      .where('note.patientId = :patientId', { patientId })
      .orderBy('note.createdAt', 'DESC')
      .take(limit);

    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN) {
      query.andWhere('note.organizationId = :orgId', { orgId: user.organizationId });
    }

    return query.getMany();
  }

  async update(id: string, dto: UpdateClinicalNoteDto, user: CurrentUserPayload): Promise<ClinicalNote> {
    const note = await this.findOne(id, user);

    if (note.status === NoteStatus.SIGNED || note.status === NoteStatus.LOCKED) {
      throw new BadRequestException('Cannot edit a signed or locked note. Use amendment instead.');
    }

    if (note.providerId !== user.sub && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only the note author can edit this note');
    }

    Object.assign(note, dto);
    const saved = await this.noteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_UPDATED',
      userId: user.sub,
      resourceType: 'clinical_note',
      resourceId: id,
    });

    return saved;
  }

  async sign(id: string, dto: SignNoteDto, user: CurrentUserPayload): Promise<ClinicalNote> {
    const note = await this.findOne(id, user);

    if (note.status !== NoteStatus.DRAFT) {
      throw new BadRequestException('Only draft notes can be signed');
    }

    if (note.providerId !== user.sub && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the note author or admin can sign this note');
    }

    note.status = NoteStatus.SIGNED;
    note.signedAt = new Date();
    note.signedBy = user.sub;

    const saved = await this.noteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_SIGNED',
      userId: user.sub,
      resourceType: 'clinical_note',
      resourceId: id,
    });

    this.logger.log(`Clinical note signed: ${id} by ${user.sub}`);
    return saved;
  }

  async amend(id: string, dto: AmendNoteDto, user: CurrentUserPayload): Promise<ClinicalNote> {
    const originalNote = await this.findOne(id, user);

    if (originalNote.status !== NoteStatus.SIGNED) {
      throw new BadRequestException('Only signed notes can be amended');
    }

    originalNote.status = NoteStatus.AMENDED;
    await this.noteRepository.save(originalNote);

    const amendedNote = this.noteRepository.create({
      patientId: originalNote.patientId,
      providerId: user.sub,
      organizationId: user.organizationId,
      type: originalNote.type,
      title: `Amendment: ${originalNote.title}`,
      content: dto.content,
      soapContent: dto.soapContent || originalNote.soapContent,
      amendedFrom: originalNote.id,
      amendmentReason: dto.reason,
      status: NoteStatus.DRAFT,
      tags: originalNote.tags,
    });

    const saved = await this.noteRepository.save(amendedNote);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_AMENDED',
      userId: user.sub,
      resourceType: 'clinical_note',
      resourceId: id,
      details: { amendedNoteId: saved.id, reason: dto.reason },
    });

    return saved;
  }

  async lock(id: string, user: CurrentUserPayload): Promise<ClinicalNote> {
    const note = await this.findOne(id, user);

    if (note.status !== NoteStatus.SIGNED) {
      throw new BadRequestException('Only signed notes can be locked');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only administrators can lock notes');
    }

    note.status = NoteStatus.LOCKED;
    const saved = await this.noteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_LOCKED',
      userId: user.sub,
      resourceType: 'clinical_note',
      resourceId: id,
    });

    return saved;
  }

  async delete(id: string, user: CurrentUserPayload): Promise<void> {
    const note = await this.findOne(id, user);

    if (note.status !== NoteStatus.DRAFT) {
      throw new BadRequestException('Only draft notes can be deleted');
    }

    if (note.providerId !== user.sub && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only the note author or admin can delete this note');
    }

    await this.noteRepository.remove(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_DELETED',
      userId: user.sub,
      resourceType: 'clinical_note',
      resourceId: id,
    });
  }

  async getTimeTrackingSummary(patientId: string, startDate: Date, endDate: Date, user: CurrentUserPayload) {
    const notes = await this.noteRepository.find({
      where: {
        patientId,
        createdAt: Between(startDate, endDate),
      },
    });

    let totalMinutes = 0;
    let billableMinutes = 0;
    const cptBreakdown: Record<string, number> = {};

    notes.forEach(note => {
      if (note.timeTracking) {
        totalMinutes += note.timeTracking.totalMinutes || 0;
        if (note.timeTracking.billable) {
          billableMinutes += note.timeTracking.totalMinutes || 0;
          const cpt = note.timeTracking.cptCode || 'unassigned';
          cptBreakdown[cpt] = (cptBreakdown[cpt] || 0) + (note.timeTracking.totalMinutes || 0);
        }
      }
    });

    return {
      patientId,
      startDate,
      endDate,
      totalMinutes,
      billableMinutes,
      noteCount: notes.length,
      cptBreakdown,
    };
  }

  async createCommunicationLog(dto: CreateCommunicationLogDto, user: CurrentUserPayload): Promise<CommunicationLog> {
    const log = this.commLogRepository.create({
      ...dto,
      providerId: user.sub,
      organizationId: user.organizationId,
    });

    const saved = await this.commLogRepository.save(log);

    await this.auditService.log({
      action: 'COMMUNICATION_LOGGED',
      userId: user.sub,
      resourceType: 'communication_log',
      resourceId: saved.id,
      details: { patientId: dto.patientId, type: dto.type },
    });

    return saved;
  }

  async getCommunicationLogs(patientId: string, user: CurrentUserPayload, limit = 50) {
    return this.commLogRepository.find({
      where: { patientId },
      relations: ['provider'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private checkAccess(note: ClinicalNote, user: CurrentUserPayload): void {
    if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
      return;
    }

    if (note.organizationId && note.organizationId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this clinical note');
    }

    if (user.role === UserRole.PATIENT && note.patientId !== user.sub) {
      throw new ForbiddenException('Access denied to this clinical note');
    }
  }
}
