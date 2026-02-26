import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { TimeEntryCategory } from './entities/time-entry.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('time')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly service: TimeTrackingService) {}

  @Post('start')
  startTimer(@Body() data: { patientId: string; userId: string; category: TimeEntryCategory; enrollmentId?: string }) {
    return this.service.startTimer(data);
  }

  @Post('stop')
  stopTimer(@Body() body: { id: string }) {
    return this.service.stopTimer(body.id);
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.findByPatient(patientId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Get('patient/:patientId/total')
  getTotalMinutes(@Param('patientId') patientId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.service.getTotalMinutes(patientId, new Date(startDate), new Date(endDate));
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.service.confirm(id);
  }
}
