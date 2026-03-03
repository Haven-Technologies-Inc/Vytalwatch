import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ChartingAssistantService, ChartingContext, SOAPNote, TriageSummary } from './charting-assistant.service';
import { RiskScoringService, RiskScore } from './risk-scoring.service';

@Controller('ai/advanced')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancedAIController {
  constructor(private readonly charting: ChartingAssistantService, private readonly risk: RiskScoringService) {}

  @Post('soap-note')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async generateSOAPNote(@Body() context: ChartingContext): Promise<{ data: SOAPNote }> {
    const note = await this.charting.generateSOAPNote(context);
    return { data: note };
  }

  @Post('triage')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async generateTriage(@Body() context: ChartingContext): Promise<{ data: TriageSummary }> {
    const triage = await this.charting.generateTriageSummary(context);
    return { data: triage };
  }

  @Post('outreach-script')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async generateOutreach(@Body() body: { context: ChartingContext; reason: string }): Promise<{ data: any }> {
    const script = await this.charting.generateOutreachScript(body.context, body.reason);
    return { data: script };
  }

  @Post('risk-score')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async calculateRisk(@Body() body: { vitals: any[]; alerts: any[]; age?: number }): Promise<{ data: RiskScore }> {
    const score = this.risk.calculateRiskScore(body.vitals, body.alerts, body.age);
    return { data: score };
  }
}
