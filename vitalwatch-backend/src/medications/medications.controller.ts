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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { MedicationsService } from './medications.service';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  DiscontinueMedicationDto,
  RecordDoseDto,
  MedicationQueryDto,
  AdherenceQueryDto,
} from './dto/medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Controller for medication management endpoints
 * Handles CRUD operations, adherence tracking, and reporting
 */
@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  /**
   * Prescribe a new medication
   * POST /medications
   * Restricted to providers and admins
   */
  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() createMedicationDto: CreateMedicationDto, @Request() req) {
    // Ensure prescribedBy is the current user
    createMedicationDto.prescribedBy = req.user.id;

    return this.medicationsService.create(createMedicationDto);
  }

  /**
   * Get all medications with filtering
   * GET /medications
   * Query params: patientId, prescribedBy, status, isActive, type, frequency, search, page, limit
   */
  @Get()
  async findAll(@Query() query: MedicationQueryDto, @Request() req) {
    // Patients can only see their own medications
    if (req.user.role === UserRole.PATIENT) {
      query.patientId = req.user.id;
    }

    // Providers see medications they prescribed by default
    if (
      req.user.role === UserRole.PROVIDER &&
      !query.patientId &&
      !query.prescribedBy
    ) {
      query.prescribedBy = req.user.id;
    }

    return this.medicationsService.findAll(query);
  }

  /**
   * Get statistics for patient's medications
   * GET /medications/stats
   */
  @Get('stats')
  async getStats(@Query('patientId') patientId: string, @Request() req) {
    // Patients can only see their own stats
    const targetPatientId =
      req.user.role === UserRole.PATIENT ? req.user.id : patientId;

    if (!targetPatientId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Patient ID is required',
      };
    }

    return this.medicationsService.getMedicationStats(targetPatientId);
  }

  /**
   * Get a specific medication by ID
   * GET /medications/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const medication = await this.medicationsService.findById(id);

    if (!medication) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Medication not found',
      };
    }

    // Access control: patients can only see their own medications
    if (
      req.user.role === UserRole.PATIENT &&
      medication.patientId !== req.user.id
    ) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
      };
    }

    return medication;
  }

  /**
   * Update a medication
   * PATCH /medications/:id
   * Restricted to providers and admins
   */
  @Patch(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateMedicationDto: UpdateMedicationDto,
    @Request() req,
  ) {
    return this.medicationsService.update(id, req.user.id, updateMedicationDto);
  }

  /**
   * Discontinue a medication
   * POST /medications/:id/discontinue
   * Restricted to providers and admins
   */
  @Post(':id/discontinue')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async discontinue(
    @Param('id') id: string,
    @Body() discontinueDto: DiscontinueMedicationDto,
    @Request() req,
  ) {
    // Ensure discontinuedBy is the current user
    discontinueDto.discontinuedBy = req.user.id;

    return this.medicationsService.discontinue(id, discontinueDto);
  }

  /**
   * Delete a medication (soft delete by discontinuing)
   * DELETE /medications/:id
   * Restricted to providers and admins
   */
  @Delete(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Request() req) {
    await this.medicationsService.delete(id, req.user.id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Medication discontinued successfully',
    };
  }

  /**
   * Record a dose (taken, missed, or skipped)
   * POST /medications/:id/doses
   */
  @Post(':id/doses')
  async recordDose(
    @Param('id') id: string,
    @Body() recordDoseDto: RecordDoseDto,
    @Request() req,
  ) {
    // Ensure recordedBy is the current user
    if (!recordDoseDto.recordedBy) {
      recordDoseDto.recordedBy = req.user.id;
    }

    // Verify patient access
    const medication = await this.medicationsService.findById(id);
    if (!medication) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Medication not found',
      };
    }

    // Patients can only record doses for their own medications
    if (
      req.user.role === UserRole.PATIENT &&
      medication.patientId !== req.user.id
    ) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
      };
    }

    return this.medicationsService.recordDose(id, recordDoseDto);
  }

  /**
   * Get adherence rate for a medication
   * GET /medications/:id/adherence
   */
  @Get(':id/adherence')
  async getAdherence(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?,
  ) {
    // Verify access
    const medication = await this.medicationsService.findById(id);
    if (!medication) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Medication not found',
      };
    }

    // Access control for patients
    if (
      req.user.role === UserRole.PATIENT &&
      medication.patientId !== req.user.id
    ) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
      };
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.medicationsService.getAdherenceRate(id, undefined, start, end);
  }

  /**
   * Get adherence records
   * GET /medications/adherence/records
   */
  @Get('adherence/records')
  async getAdherenceRecords(@Query() query: AdherenceQueryDto, @Request() req) {
    // Patients can only see their own records
    if (req.user.role === UserRole.PATIENT) {
      query.patientId = req.user.id;
    }

    return this.medicationsService.getAdherenceRecords(query);
  }

  /**
   * Get patient's overall adherence
   * GET /medications/adherence/overview
   */
  @Get('adherence/overview')
  async getAdherenceOverview(
    @Query('patientId') patientId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?,
  ) {
    // Patients can only see their own overview
    const targetPatientId =
      req.user.role === UserRole.PATIENT ? req.user.id : patientId;

    if (!targetPatientId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Patient ID is required',
      };
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    // Get overall adherence for all patient's medications
    const adherence = await this.medicationsService.getAdherenceRate(
      undefined,
      targetPatientId,
      start,
      end,
    );

    // Get medication stats
    const stats = await this.medicationsService.getMedicationStats(targetPatientId);

    return {
      ...adherence,
      ...stats,
    };
  }

  /**
   * Check for medication interactions
   * POST /medications/check-interactions
   */
  @Post('check-interactions')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async checkInteractions(
    @Body() body: { patientId: string; medicationName: string },
  ) {
    const interactions = await this.medicationsService.checkInteractions(
      body.patientId,
      body.medicationName,
    );

    return {
      medicationName: body.medicationName,
      hasInteractions: interactions.length > 0,
      interactions,
      message:
        interactions.length > 0
          ? `Potential interactions detected with: ${interactions.join(', ')}`
          : 'No known interactions detected',
    };
  }

  /**
   * Get upcoming medication schedule
   * GET /medications/schedule/upcoming
   */
  @Get('schedule/upcoming')
  async getUpcomingSchedule(
    @Query('patientId') patientId: string,
    @Query('days') days: string,
    @Request() req,
  ) {
    // Patients can only see their own schedule
    const targetPatientId =
      req.user.role === UserRole.PATIENT ? req.user.id : patientId;

    if (!targetPatientId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Patient ID is required',
      };
    }

    const daysAhead = days ? parseInt(days) : 7;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    // Get all active medications for the patient
    const { medications } = await this.medicationsService.findAll({
      patientId: targetPatientId,
      isActive: true,
      page: 1,
      limit: 100,
    });

    return {
      patientId: targetPatientId,
      startDate,
      endDate,
      daysAhead,
      medicationCount: medications.length,
      medications: medications.map(med => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        instructions: med.instructions,
        reminderEnabled: med.reminderEnabled,
      })),
    };
  }

  /**
   * Request refill
   * POST /medications/:id/refill
   */
  @Post(':id/refill')
  async requestRefill(@Param('id') id: string, @Request() req) {
    const medication = await this.medicationsService.findById(id);

    if (!medication) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Medication not found',
      };
    }

    // Patients can only request refills for their own medications
    if (
      req.user.role === UserRole.PATIENT &&
      medication.patientId !== req.user.id
    ) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
      };
    }

    // Update refills used
    if (medication.refillsUsed < medication.refillsAuthorized) {
      await this.medicationsService.update(id, req.user.id, {
        // @ts-ignore - refillsUsed not in DTO but handled by service
        refillsUsed: medication.refillsUsed + 1,
        // @ts-ignore
        lastRefillDate: new Date(),
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Refill recorded successfully',
        refillsRemaining: medication.refillsAuthorized - medication.refillsUsed - 1,
      };
    } else {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No refills remaining. Please contact your provider.',
        refillsRemaining: 0,
      };
    }
  }

  /**
   * Get medication history (all changes)
   * GET /medications/:id/history
   * Returns audit trail for the medication
   */
  @Get(':id/history')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getHistory(@Param('id') id: string) {
    // This would integrate with the audit service
    // For now, return a placeholder
    return {
      medicationId: id,
      message: 'Medication history would be retrieved from audit logs',
    };
  }
}
