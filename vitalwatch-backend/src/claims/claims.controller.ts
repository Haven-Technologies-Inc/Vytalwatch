import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Post('build')
  build(@Body() data: { patientId: string; enrollmentId: string; periodStart: string; periodEnd: string; programType: string; readingDaysCount: number; interactiveTimeMinutes: number; notesSigned: boolean }) {
    return this.service.build({ ...data, periodStart: new Date(data.periodStart), periodEnd: new Date(data.periodEnd) });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/finalize')
  finalize(@Param('id') id: string) { return this.service.finalize(id); }

  @Get()
  findByPatient(@Query('patientId') patientId: string) { return this.service.findByPatient(patientId); }
}
