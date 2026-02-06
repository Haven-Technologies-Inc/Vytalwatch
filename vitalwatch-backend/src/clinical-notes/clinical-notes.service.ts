import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Like, IsNull, Not } from 'typeorm';
import * as crypto from 'crypto';
import {
  ClinicalNote,
  NoteType,
  EncounterType,
  NoteStatus,
  DigitalSignature,
  Amendment,
  SOAPStructure,
} from './entities/clinical-note.entity';
import {
  CreateClinicalNoteDto,
  UpdateClinicalNoteDto,
  AmendNoteDto,
  SignNoteDto,
  AddAddendumDto,
  CoSignNoteDto,
  SearchClinicalNotesDto,
  GenerateNoteDto,
  NoteTemplate,
  VisitSummary,
} from './dto/clinical-note.dto';
import { AuditService } from '../audit/audit.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class ClinicalNotesService {
  private readonly logger = new Logger(ClinicalNotesService.name);

  // In-memory template storage (in production, use database)
  private templates: NoteTemplate[] = [];

  constructor(
    @InjectRepository(ClinicalNote)
    private readonly clinicalNoteRepository: Repository<ClinicalNote>,
    private readonly auditService: AuditService,
    private readonly aiService: AIService,
  ) {
    this.initializeDefaultTemplates();
  }

  /**
   * Create a new clinical note
   */
  async create(createDto: CreateClinicalNoteDto): Promise<ClinicalNote> {
    // Validate provider authorization
    await this.validateProviderAccess(createDto.providerId, createDto.patientId);

    const note = this.clinicalNoteRepository.create({
      ...createDto,
      status: NoteStatus.DRAFT,
      encounterDate: new Date(createDto.encounterDate),
    });

    const saved = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_CREATED',
      userId: createDto.providerId,
      resourceType: 'clinical_note',
      resourceId: saved.id,
      details: {
        patientId: createDto.patientId,
        noteType: createDto.noteType,
        encounterType: createDto.encounterType,
      },
    });

    return saved;
  }

  /**
   * Create note from template
   */
  async createFromTemplate(
    templateId: string,
    patientId: string,
    providerId: string,
    encounterDate: Date,
  ): Promise<ClinicalNote> {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const content = template.template.sections
      .map((s) => `${s.name}:\n${s.content}\n`)
      .join('\n');

    return this.create({
      patientId,
      providerId,
      noteType: template.noteType,
      encounterType: template.encounterType,
      encounterDate,
      title: template.template.title,
      content,
      structuredData: template.template.structuredDataTemplate,
      templateId,
    });
  }

  /**
   * Find a clinical note by ID
   */
  async findById(id: string, userId?: string): Promise<ClinicalNote | null> {
    const note = await this.clinicalNoteRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['patient', 'provider'],
    });

    if (!note) {
      return null;
    }

    // Check access permissions
    if (userId && note.isConfidential) {
      if (
        note.providerId !== userId &&
        note.patientId !== userId &&
        !note.accessibleTo?.includes(userId)
      ) {
        throw new ForbiddenException('Access denied to this confidential note');
      }
    }

    return note;
  }

  /**
   * Update a clinical note (only if not locked)
   */
  async update(
    id: string,
    updateDto: UpdateClinicalNoteDto,
    userId: string,
  ): Promise<ClinicalNote> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (note.isLocked) {
      throw new BadRequestException(
        'Cannot update a locked note. Use amend() to make changes.',
      );
    }

    if (note.isSigned && note.status === NoteStatus.SIGNED) {
      throw new BadRequestException(
        'Cannot update a signed note. Use amend() to make changes.',
      );
    }

    // Track what was changed for audit
    const changes: any = {};
    Object.keys(updateDto).forEach((key) => {
      if (updateDto[key] !== undefined && note[key] !== updateDto[key]) {
        changes[key] = { old: note[key], new: updateDto[key] };
      }
    });

    Object.assign(note, updateDto);
    note.lastEditedBy = userId;
    note.lastEditedAt = new Date();

    const updated = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_UPDATED',
      userId,
      resourceType: 'clinical_note',
      resourceId: id,
      details: { changes },
    });

    return updated;
  }

  /**
   * Amend a signed/locked note (creates amendment record)
   */
  async amend(id: string, amendDto: AmendNoteDto): Promise<ClinicalNote> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (!note.isSigned && !note.isLocked) {
      throw new BadRequestException(
        'Only signed or locked notes can be amended. Use update() for draft notes.',
      );
    }

    const amendment: Amendment = {
      id: crypto.randomUUID(),
      amendedBy: amendDto.amendedBy,
      amendedAt: new Date(),
      reason: amendDto.reason,
      changes: amendDto.changes,
      addendum: amendDto.addendum,
    };

    note.amendments = note.amendments || [];
    note.amendments.push(amendment);
    note.isAmended = true;

    // Apply the changes
    amendDto.changes.forEach((change) => {
      if (change.field in note) {
        note[change.field] = change.newValue;
      } else if (note.structuredData && change.field in note.structuredData) {
        note.structuredData[change.field] = change.newValue;
      }
    });

    note.lastEditedBy = amendDto.amendedBy;
    note.lastEditedAt = new Date();

    const updated = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_AMENDED',
      userId: amendDto.amendedBy,
      resourceType: 'clinical_note',
      resourceId: id,
      details: {
        reason: amendDto.reason,
        changes: amendDto.changes,
      },
    });

    return updated;
  }

  /**
   * Sign a note with digital signature
   */
  async sign(id: string, signDto: SignNoteDto, userId: string): Promise<ClinicalNote> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (note.isSigned) {
      throw new BadRequestException('Note is already signed');
    }

    if (note.providerId !== userId) {
      throw new ForbiddenException('Only the note author can sign it');
    }

    // Validate compliance requirements
    await this.validateNoteCompleteness(note);

    // Create signature hash
    const noteContent = JSON.stringify({
      content: note.content,
      structuredData: note.structuredData,
      encounterDate: note.encounterDate,
      patientId: note.patientId,
    });
    const signatureHash = crypto.createHash('sha256').update(noteContent).digest('hex');

    const signature: DigitalSignature = {
      signedBy: userId,
      signedAt: new Date(),
      signatureMethod: signDto.signatureMethod,
      signatureHash,
      ipAddress: signDto.ipAddress,
      userAgent: signDto.userAgent,
      location: signDto.location,
    };

    note.signature = signature;
    note.isSigned = true;
    note.signedAt = new Date();
    note.status = NoteStatus.SIGNED;

    const signed = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_SIGNED',
      userId,
      resourceType: 'clinical_note',
      resourceId: id,
      details: {
        signatureMethod: signDto.signatureMethod,
        signatureHash,
      },
      ipAddress: signDto.ipAddress,
      userAgent: signDto.userAgent,
    });

    return signed;
  }

  /**
   * Lock a note to prevent further edits
   */
  async lock(id: string, userId: string): Promise<ClinicalNote> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (!note.isSigned) {
      throw new BadRequestException('Only signed notes can be locked');
    }

    if (note.isLocked) {
      throw new BadRequestException('Note is already locked');
    }

    note.isLocked = true;
    note.lockedAt = new Date();
    note.lockedBy = userId;
    note.status = NoteStatus.LOCKED;

    const locked = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_LOCKED',
      userId,
      resourceType: 'clinical_note',
      resourceId: id,
      details: {},
    });

    return locked;
  }

  /**
   * Add addendum to a signed note
   */
  async addAddendum(id: string, addendumDto: AddAddendumDto): Promise<ClinicalNote> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (!note.isSigned) {
      throw new BadRequestException('Can only add addendum to signed notes');
    }

    note.addendum = note.addendum
      ? `${note.addendum}\n\n--- Addendum ${new Date().toISOString()} ---\n${addendumDto.content}`
      : addendumDto.content;
    note.addendumAddedAt = new Date();
    note.addendumAddedBy = addendumDto.addedBy;

    const updated = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_ADDENDUM_ADDED',
      userId: addendumDto.addedBy,
      resourceType: 'clinical_note',
      resourceId: id,
      details: { addendum: addendumDto.content },
    });

    return updated;
  }

  /**
   * Co-sign a note
   */
  async coSign(id: string, coSignDto: CoSignNoteDto): Promise<ClinicalNote> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (!note.requiresCoSignature) {
      throw new BadRequestException('This note does not require co-signature');
    }

    if (!note.isSigned) {
      throw new BadRequestException('Note must be signed before co-signing');
    }

    note.coSignedBy = coSignDto.coSignedBy;
    note.coSignedAt = new Date();
    note.coSignatureNotes = coSignDto.notes;

    const updated = await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_COSIGNED',
      userId: coSignDto.coSignedBy,
      resourceType: 'clinical_note',
      resourceId: id,
      details: { notes: coSignDto.notes },
    });

    return updated;
  }

  /**
   * Search and filter clinical notes
   */
  async search(
    searchDto: SearchClinicalNotesDto,
  ): Promise<{ notes: ClinicalNote[]; total: number }> {
    const {
      patientId,
      providerId,
      noteType,
      encounterType,
      status,
      startDate,
      endDate,
      searchTerm,
      icdCodes,
      cptCodes,
      isConfidential,
      page = 1,
      limit = 50,
      sortBy = 'encounterDate',
      sortOrder = 'DESC',
    } = searchDto;

    const queryBuilder = this.clinicalNoteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.patient', 'patient')
      .leftJoinAndSelect('note.provider', 'provider')
      .where('note.deletedAt IS NULL');

    if (patientId) {
      queryBuilder.andWhere('note.patientId = :patientId', { patientId });
    }

    if (providerId) {
      queryBuilder.andWhere('note.providerId = :providerId', { providerId });
    }

    if (noteType) {
      if (Array.isArray(noteType)) {
        queryBuilder.andWhere('note.noteType IN (:...noteTypes)', {
          noteTypes: noteType,
        });
      } else {
        queryBuilder.andWhere('note.noteType = :noteType', { noteType });
      }
    }

    if (encounterType) {
      if (Array.isArray(encounterType)) {
        queryBuilder.andWhere('note.encounterType IN (:...encounterTypes)', {
          encounterTypes: encounterType,
        });
      } else {
        queryBuilder.andWhere('note.encounterType = :encounterType', {
          encounterType,
        });
      }
    }

    if (status) {
      if (Array.isArray(status)) {
        queryBuilder.andWhere('note.status IN (:...statuses)', { statuses: status });
      } else {
        queryBuilder.andWhere('note.status = :status', { status });
      }
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('note.encounterDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (searchTerm) {
      queryBuilder.andWhere(
        '(note.title ILIKE :searchTerm OR note.content ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (icdCodes && icdCodes.length > 0) {
      queryBuilder.andWhere('note.icdCodes && :icdCodes', { icdCodes });
    }

    if (cptCodes && cptCodes.length > 0) {
      queryBuilder.andWhere('note.cptCodes && :cptCodes', { cptCodes });
    }

    if (isConfidential !== undefined) {
      queryBuilder.andWhere('note.isConfidential = :isConfidential', {
        isConfidential,
      });
    }

    queryBuilder
      .orderBy(`note.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [notes, total] = await queryBuilder.getManyAndCount();

    return { notes, total };
  }

  /**
   * Get all notes for a specific patient
   */
  async getPatientNotes(
    patientId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ notes: ClinicalNote[]; total: number }> {
    return this.search({
      patientId,
      page: options?.page || 1,
      limit: options?.limit || 50,
    });
  }

  /**
   * Generate visit summary from a note
   */
  async generateVisitSummary(noteId: string): Promise<VisitSummary> {
    const note = await this.findById(noteId);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    const soapData = note.structuredData as SOAPStructure;

    return {
      noteId: note.id,
      patientId: note.patientId,
      patientName: note.patient?.fullName || 'Unknown',
      providerId: note.providerId,
      providerName: note.provider?.fullName || 'Unknown',
      encounterDate: note.encounterDate,
      encounterType: note.encounterType,
      noteType: note.noteType,
      diagnosis: soapData?.assessment?.diagnosis || [],
      vitals: this.extractVitalsFromNote(note),
      medications: soapData?.plan?.medications || [],
      plan: soapData?.plan?.treatments || [],
      followUp: soapData?.plan?.followUp || {
        type: 'N/A',
        timeframe: 'N/A',
        instructions: 'N/A',
      },
      billingCodes: {
        icd: note.icdCodes || [],
        cpt: note.cptCodes || [],
      },
    };
  }

  /**
   * AI-assisted note generation
   */
  async generateWithAI(generateDto: GenerateNoteDto): Promise<ClinicalNote> {
    try {
      // Fetch related data
      const vitals = generateDto.vitalReadingIds
        ? await this.fetchVitalReadings(generateDto.vitalReadingIds)
        : [];
      const alerts = generateDto.alertIds
        ? await this.fetchAlerts(generateDto.alertIds)
        : [];

      // Build prompt for AI
      const prompt = this.buildAINotePrompt(generateDto, vitals, alerts);

      // Generate note content using AI
      const aiResponse = await this.aiService.chatWithAI(
        [{ role: 'user', content: prompt }],
        { patientId: generateDto.patientId, vitals },
      );

      // Parse AI response and create structured data
      const structuredData = this.parseAIResponse(aiResponse, generateDto.noteType);

      // Create the note
      const note = await this.create({
        patientId: generateDto.patientId,
        providerId: generateDto.providerId,
        noteType: generateDto.noteType,
        encounterType: generateDto.encounterType,
        encounterDate: generateDto.encounterDate,
        title: `${generateDto.noteType.toUpperCase()} Note - ${new Date().toLocaleDateString()}`,
        content: aiResponse,
        structuredData,
        vitalReadingIds: generateDto.vitalReadingIds,
        alertIds: generateDto.alertIds,
      });

      // Mark as AI-generated
      note.aiGenerated = true;
      note.aiMetadata = {
        model: 'gpt-4',
        generatedAt: new Date(),
        confidence: 0.85,
        humanEdited: false,
        editedFields: [],
      };

      return this.clinicalNoteRepository.save(note);
    } catch (error) {
      this.logger.error('Failed to generate note with AI', error);
      throw new BadRequestException('Failed to generate note with AI');
    }
  }

  /**
   * Get all available templates
   */
  getTemplates(noteType?: NoteType): NoteTemplate[] {
    if (noteType) {
      return this.templates.filter((t) => t.noteType === noteType);
    }
    return this.templates;
  }

  /**
   * Soft delete a note
   */
  async delete(id: string, userId: string, reason: string): Promise<void> {
    const note = await this.findById(id);
    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    if (note.isSigned || note.isLocked) {
      throw new BadRequestException(
        'Cannot delete signed or locked notes. Contact administrator.',
      );
    }

    note.deletedAt = new Date();
    note.deletedBy = userId;
    note.deletionReason = reason;
    note.status = NoteStatus.DELETED;

    await this.clinicalNoteRepository.save(note);

    await this.auditService.log({
      action: 'CLINICAL_NOTE_DELETED',
      userId,
      resourceType: 'clinical_note',
      resourceId: id,
      details: { reason },
    });
  }

  /**
   * Validate note completeness for compliance
   */
  private async validateNoteCompleteness(note: ClinicalNote): Promise<void> {
    const errors: string[] = [];

    if (!note.title || note.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!note.content || note.content.trim().length === 0) {
      errors.push('Content is required');
    }

    if (!note.encounterDate) {
      errors.push('Encounter date is required');
    }

    if (note.noteType === NoteType.SOAP && note.structuredData) {
      const soap = note.structuredData as SOAPStructure;
      if (!soap.subjective || !soap.objective || !soap.assessment || !soap.plan) {
        errors.push('SOAP note must include all four sections');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Note is incomplete: ${errors.join(', ')}`,
      );
    }
  }

  /**
   * Validate provider has access to patient
   */
  private async validateProviderAccess(
    providerId: string,
    patientId: string,
  ): Promise<void> {
    // In production, check provider-patient relationship in database
    // For now, just validate IDs are present
    if (!providerId || !patientId) {
      throw new BadRequestException('Provider ID and Patient ID are required');
    }
  }

  /**
   * Extract vitals data from note for summary
   */
  private extractVitalsFromNote(note: ClinicalNote): any[] {
    if (!note.structuredData || note.noteType !== NoteType.SOAP) {
      return [];
    }

    const soap = note.structuredData as SOAPStructure;
    const vitals = soap.objective?.vitalSigns;

    if (!vitals) {
      return [];
    }

    const result: any[] = [];

    if (vitals.bloodPressure) {
      result.push({
        type: 'Blood Pressure',
        value: vitals.bloodPressure,
        status: 'normal',
      });
    }

    if (vitals.heartRate) {
      result.push({
        type: 'Heart Rate',
        value: `${vitals.heartRate} bpm`,
        status: 'normal',
      });
    }

    if (vitals.temperature) {
      result.push({
        type: 'Temperature',
        value: `${vitals.temperature}°F`,
        status: 'normal',
      });
    }

    return result;
  }

  /**
   * Build AI prompt for note generation
   */
  private buildAINotePrompt(
    generateDto: GenerateNoteDto,
    vitals: any[],
    alerts: any[],
  ): string {
    const noteTypeDescriptions = {
      [NoteType.SOAP]: 'SOAP (Subjective, Objective, Assessment, Plan)',
      [NoteType.PROGRESS]: 'Progress Note',
      [NoteType.CONSULTATION]: 'Consultation Note',
      [NoteType.ASSESSMENT]: 'Clinical Assessment',
      [NoteType.RPM_REVIEW]: 'Remote Patient Monitoring Review',
    };

    return `
      Generate a comprehensive ${noteTypeDescriptions[generateDto.noteType]} for a remote patient monitoring encounter.

      Encounter Details:
      - Type: ${generateDto.encounterType}
      - Date: ${generateDto.encounterDate}
      ${generateDto.context?.chiefComplaint ? `- Chief Complaint: ${generateDto.context.chiefComplaint}` : ''}
      ${generateDto.context?.symptoms ? `- Symptoms: ${generateDto.context.symptoms.join(', ')}` : ''}
      ${generateDto.context?.duration ? `- Duration: ${generateDto.context.duration}` : ''}

      Recent Vital Signs:
      ${vitals.map((v) => `- ${v.type}: ${v.value} ${v.unit} (${v.status})`).join('\n')}

      Recent Alerts:
      ${alerts.map((a) => `- ${a.type}: ${a.severity} - ${a.message}`).join('\n')}

      ${generateDto.context?.additionalInfo ? `Additional Context:\n${generateDto.context.additionalInfo}` : ''}

      Please generate a professional clinical note following standard medical documentation practices.
      ${generateDto.noteType === NoteType.SOAP ? 'Structure the note with clear SOAP sections.' : ''}
    `;
  }

  /**
   * Parse AI response into structured data
   */
  private parseAIResponse(
    response: string,
    noteType: NoteType,
  ): SOAPStructure | Record<string, any> {
    if (noteType === NoteType.SOAP) {
      // Attempt to extract SOAP sections from AI response
      const soapPattern = {
        subjective: /Subjective:?\s*([\s\S]*?)(?=Objective:|$)/i,
        objective: /Objective:?\s*([\s\S]*?)(?=Assessment:|$)/i,
        assessment: /Assessment:?\s*([\s\S]*?)(?=Plan:|$)/i,
        plan: /Plan:?\s*([\s\S]*?)$/i,
      };

      return {
        subjective: {
          chiefComplaint: this.extractSection(response, soapPattern.subjective),
        },
        objective: {
          physicalExam: this.extractSection(response, soapPattern.objective),
        },
        assessment: {
          diagnosis: [],
          progressNotes: this.extractSection(response, soapPattern.assessment),
        },
        plan: {
          treatments: [],
          medications: [],
        },
      };
    }

    return {};
  }

  /**
   * Extract section from text using regex
   */
  private extractSection(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  }

  /**
   * Fetch vital readings (mock - implement actual repository call)
   */
  private async fetchVitalReadings(ids: string[]): Promise<any[]> {
    // In production, inject VitalsService and fetch actual data
    return [];
  }

  /**
   * Fetch alerts (mock - implement actual repository call)
   */
  private async fetchAlerts(ids: string[]): Promise<any[]> {
    // In production, inject AlertsService and fetch actual data
    return [];
  }

  /**
   * Initialize default note templates
   */
  private initializeDefaultTemplates(): void {
    this.templates = [
      {
        id: 'template-soap-telehealth',
        name: 'SOAP Note - Telehealth Visit',
        noteType: NoteType.SOAP,
        encounterType: EncounterType.TELEHEALTH,
        template: {
          title: 'Telehealth SOAP Note',
          sections: [
            {
              name: 'Subjective',
              content: 'Chief Complaint:\nHistory of Present Illness:\nReview of Systems:',
              required: true,
            },
            {
              name: 'Objective',
              content: 'Vital Signs:\nPhysical Examination (via video):\nDevice Data Review:',
              required: true,
            },
            {
              name: 'Assessment',
              content: 'Diagnosis:\nDifferential Diagnosis:\nRisk Assessment:',
              required: true,
            },
            {
              name: 'Plan',
              content: 'Treatment Plan:\nMedications:\nFollow-up:\nPatient Education:',
              required: true,
            },
          ],
          structuredDataTemplate: {
            subjective: {},
            objective: {},
            assessment: {},
            plan: {},
          },
        },
        isPublic: true,
        createdBy: 'system',
      },
      {
        id: 'template-rpm-review',
        name: 'RPM Review Note',
        noteType: NoteType.RPM_REVIEW,
        encounterType: EncounterType.RPM_MONITORING,
        template: {
          title: 'Remote Patient Monitoring Review',
          sections: [
            {
              name: 'Monitoring Period',
              content: 'Review period:\nCompliance rate:\n',
              required: true,
            },
            {
              name: 'Vital Trends',
              content: 'Blood Pressure Trends:\nGlucose Trends:\nWeight Trends:\nOther Vitals:',
              required: true,
            },
            {
              name: 'Alerts Review',
              content: 'Critical Alerts:\nWarning Alerts:\nAlert Response:',
              required: true,
            },
            {
              name: 'Clinical Assessment',
              content: 'Overall Status:\nConcerns:\nInterventions:',
              required: true,
            },
            {
              name: 'Plan',
              content: 'Adjustments to Care Plan:\nFollow-up:\nCommunication with Patient:',
              required: true,
            },
          ],
        },
        isPublic: true,
        createdBy: 'system',
      },
      {
        id: 'template-progress-note',
        name: 'Progress Note',
        noteType: NoteType.PROGRESS,
        encounterType: EncounterType.PHONE,
        template: {
          title: 'Progress Note',
          sections: [
            {
              name: 'Interval History',
              content: 'Changes since last visit:\nSymptoms:\nCompliance:',
              required: true,
            },
            {
              name: 'Current Status',
              content: 'Current condition:\nVital signs:\nFunctional status:',
              required: true,
            },
            {
              name: 'Assessment and Plan',
              content: 'Assessment:\nPlan updates:\nNext steps:',
              required: true,
            },
          ],
        },
        isPublic: true,
        createdBy: 'system',
      },
    ];
  }
}
