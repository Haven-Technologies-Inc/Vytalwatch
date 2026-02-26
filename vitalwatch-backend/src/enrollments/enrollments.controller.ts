import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Post()
  create(@Body() data: Partial<Enrollment>) { return this.service.create(data); }

  @Get()
  findAll(@Query('clinicId') clinicId?: string, @Query('patientId') patientId?: string, @Query('status') status?: EnrollmentStatus) {
    return this.service.findAll({ clinicId, patientId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Enrollment>) { return this.service.update(id, data); }

  @Post(':id/complete-setup')
  completeSetup(@Param('id') id: string, @Body() body: { noteId: string }) { return this.service.completeSetup(id, body.noteId); }

  @Post(':id/advance-period')
  advanceBillingPeriod(@Param('id') id: string) { return this.service.advanceBillingPeriod(id); }
}
