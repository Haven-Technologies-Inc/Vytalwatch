import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import {
  CreateClinicalNoteDto,
  UpdateClinicalNoteDto,
  AmendNoteDto,
  SignNoteDto,
  AddAddendumDto,
  CoSignNoteDto,
  SearchClinicalNotesDto,
  GenerateNoteDto,
} from './dto/clinical-note.dto';
import { NoteType, NoteStatus, EncounterType } from './entities/clinical-note.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('clinical-notes')
@UseGuards(JwtAuthGuard)
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  /**
   * Create a new clinical note
   * POST /clinical-notes
   */
  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async create(@Body() createDto: CreateClinicalNoteDto, @Request() req) {
    return this.clinicalNotesService.create({
      ...createDto,
      providerId: req.user.role === UserRole.PROVIDER ? req.user.id : createDto.providerId,
    });
  }

  /**
   * Create note from template
   * POST /clinical-notes/from-template/:templateId
   */
  @Post('from-template/:templateId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { patientId: string; encounterDate: string },
    @Request() req,
  ) {
    return this.clinicalNotesService.createFromTemplate(
      templateId,
      body.patientId,
      req.user.id,
      new Date(body.encounterDate),
    );
  }

  /**
   * Get all clinical notes with filters
   * GET /clinical-notes
   */
  @Get()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(@Query() query: any) {
    const searchDto: SearchClinicalNotesDto = {
      patientId: query.patientId,
      providerId: query.providerId,
      noteType: query.noteType ? this.parseEnumArray(query.noteType, NoteType) : undefined,
      encounterType: query.encounterType
        ? this.parseEnumArray(query.encounterType, EncounterType)
        : undefined,
      status: query.status ? this.parseEnumArray(query.status, NoteStatus) : undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      searchTerm: query.searchTerm,
      icdCodes: query.icdCodes ? query.icdCodes.split(',') : undefined,
      cptCodes: query.cptCodes ? query.cptCodes.split(',') : undefined,
      isConfidential: query.isConfidential === 'true' ? true : query.isConfidential === 'false' ? false : undefined,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      sortBy: query.sortBy || 'encounterDate',
      sortOrder: query.sortOrder === 'ASC' ? 'ASC' : 'DESC',
    };

    return this.clinicalNotesService.search(searchDto);
  }

  /**
   * Get a specific clinical note by ID
   * GET /clinical-notes/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const note = await this.clinicalNotesService.findById(id, req.user.id);
    if (!note) {
      return { message: 'Clinical note not found', statusCode: 404 };
    }
    return note;
  }

  /**
   * Get all notes for a specific patient
   * GET /clinical-notes/patient/:patientId
   */
  @Get('patient/:patientId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientNotes(
    @Param('patientId') patientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clinicalNotesService.getPatientNotes(patientId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Get patient's own notes (for patient role)
   * GET /clinical-notes/my-notes
   */
  @Get('my/notes')
  @Roles(UserRole.PATIENT)
  async getMyNotes(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.clinicalNotesService.getPatientNotes(req.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Update a clinical note (only if not signed/locked)
   * PATCH /clinical-notes/:id
   */
  @Patch(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateClinicalNoteDto,
    @Request() req,
  ) {
    return this.clinicalNotesService.update(id, updateDto, req.user.id);
  }

  /**
   * Amend a signed/locked note
   * POST /clinical-notes/:id/amend
   */
  @Post(':id/amend')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async amend(@Param('id') id: string, @Body() amendDto: AmendNoteDto, @Request() req) {
    return this.clinicalNotesService.amend(id, {
      ...amendDto,
      amendedBy: req.user.id,
    });
  }

  /**
   * Sign a clinical note
   * POST /clinical-notes/:id/sign
   */
  @Post(':id/sign')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sign(@Param('id') id: string, @Body() signDto: SignNoteDto, @Request() req) {
    return this.clinicalNotesService.sign(
      id,
      {
        ...signDto,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      req.user.id,
    );
  }

  /**
   * Lock a clinical note
   * POST /clinical-notes/:id/lock
   */
  @Post(':id/lock')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async lock(@Param('id') id: string, @Request() req) {
    return this.clinicalNotesService.lock(id, req.user.id);
  }

  /**
   * Add addendum to a signed note
   * POST /clinical-notes/:id/addendum
   */
  @Post(':id/addendum')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async addAddendum(@Param('id') id: string, @Body() addendumDto: AddAddendumDto, @Request() req) {
    return this.clinicalNotesService.addAddendum(id, {
      ...addendumDto,
      addedBy: req.user.id,
    });
  }

  /**
   * Co-sign a clinical note
   * POST /clinical-notes/:id/cosign
   */
  @Post(':id/cosign')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async coSign(@Param('id') id: string, @Body() coSignDto: Partial<CoSignNoteDto>, @Request() req) {
    return this.clinicalNotesService.coSign(id, {
      coSignedBy: req.user.id,
      notes: coSignDto.notes,
    });
  }

  /**
   * Get all available templates
   * GET /clinical-notes/templates
   */
  @Get('templates/list')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getTemplates(@Query('noteType') noteType?: string) {
    const type = noteType ? (noteType as NoteType) : undefined;
    return this.clinicalNotesService.getTemplates(type);
  }

  /**
   * Generate note with AI assistance
   * POST /clinical-notes/generate
   */
  @Post('generate/ai')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async generateWithAI(@Body() generateDto: GenerateNoteDto, @Request() req) {
    return this.clinicalNotesService.generateWithAI({
      ...generateDto,
      providerId: req.user.id,
    });
  }

  /**
   * Generate visit summary from a note
   * GET /clinical-notes/:id/summary
   */
  @Get(':id/summary')
  async getVisitSummary(@Param('id') id: string) {
    return this.clinicalNotesService.generateVisitSummary(id);
  }

  /**
   * Soft delete a clinical note
   * DELETE /clinical-notes/:id
   */
  @Delete(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    await this.clinicalNotesService.delete(id, req.user.id, body.reason);
  }

  /**
   * Get notes statistics for a patient
   * GET /clinical-notes/stats/patient/:patientId
   */
  @Get('stats/patient/:patientId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientStats(@Param('patientId') patientId: string) {
    const { notes, total } = await this.clinicalNotesService.getPatientNotes(patientId, {
      limit: 1000,
    });

    const stats = {
      total,
      byType: this.countByField(notes, 'noteType'),
      byEncounterType: this.countByField(notes, 'encounterType'),
      byStatus: this.countByField(notes, 'status'),
      signed: notes.filter((n) => n.isSigned).length,
      locked: notes.filter((n) => n.isLocked).length,
      amended: notes.filter((n) => n.isAmended).length,
      aiGenerated: notes.filter((n) => n.aiGenerated).length,
      lastEncounter: notes.length > 0 ? notes[0].encounterDate : null,
    };

    return stats;
  }

  /**
   * Get notes statistics for a provider
   * GET /clinical-notes/stats/provider/:providerId
   */
  @Get('stats/provider/:providerId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getProviderStats(@Param('providerId') providerId: string) {
    const { notes, total } = await this.clinicalNotesService.search({
      providerId,
      limit: 1000,
    });

    const stats = {
      total,
      byType: this.countByField(notes, 'noteType'),
      byStatus: this.countByField(notes, 'status'),
      pending: notes.filter((n) => n.status === NoteStatus.PENDING_SIGNATURE).length,
      recentActivity: notes.slice(0, 10).map((n) => ({
        id: n.id,
        patientId: n.patientId,
        noteType: n.noteType,
        encounterDate: n.encounterDate,
        status: n.status,
      })),
    };

    return stats;
  }

  /**
   * Helper: Parse enum array from query string
   */
  private parseEnumArray(value: string | string[], enumType: any): any[] | any {
    if (Array.isArray(value)) {
      return value.filter((v) => Object.values(enumType).includes(v));
    }
    if (value.includes(',')) {
      return value.split(',').filter((v) => Object.values(enumType).includes(v));
    }
    return Object.values(enumType).includes(value) ? value : undefined;
  }

  /**
   * Helper: Count occurrences by field
   */
  private countByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}
