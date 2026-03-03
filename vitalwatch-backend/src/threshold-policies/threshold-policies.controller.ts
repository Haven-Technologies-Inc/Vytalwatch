import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ThresholdPoliciesService } from './threshold-policies.service';
import { ThresholdPolicy } from './entities/threshold-policy.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('threshold-policies')
@UseGuards(JwtAuthGuard)
export class ThresholdPoliciesController {
  constructor(private readonly service: ThresholdPoliciesService) {}

  @Post()
  create(@Body() data: Partial<ThresholdPolicy>) { return this.service.create(data); }

  @Get()
  findAll(@Query('clinicId') clinicId: string) { return this.service.findAll(clinicId); }

  @Get('active')
  findActive(@Query('clinicId') clinicId: string, @Query('programType') programType: string) {
    return this.service.findActive(clinicId, programType);
  }

  @Get('by-date')
  findByDate(@Query('clinicId') clinicId: string, @Query('programType') programType: string, @Query('date') date: string) {
    return this.service.findByDate(clinicId, programType, new Date(date));
  }
}
