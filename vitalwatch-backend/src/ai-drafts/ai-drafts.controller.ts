import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AIDraftsService } from './ai-drafts.service';
import { AIDraft, AIDraftStatus, AIDraftType } from './entities/ai-draft.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai/drafts')
@UseGuards(JwtAuthGuard)
export class AIDraftsController {
  constructor(private readonly service: AIDraftsService) {}

  @Post()
  create(@Body() data: Partial<AIDraft>) { return this.service.create(data); }

  @Get()
  findByPatient(@Query('patientId') patientId: string, @Query('type') draftType?: AIDraftType, @Query('status') status?: AIDraftStatus) {
    return this.service.findByPatient(patientId, draftType, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() body: { userId: string; status: AIDraftStatus; notes?: string }) {
    return this.service.review(id, body.userId, body.status, body.notes);
  }
}
