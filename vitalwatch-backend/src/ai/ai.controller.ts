import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ) {
    const response = await this.aiService.chatWithAI(body.messages);
    return { response };
  }

  @Post('analyze-vitals')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async analyzeVitals(@Body() body: { vitals: any[] }) {
    const analyses = await Promise.all(
      body.vitals.map(vital => this.aiService.analyzeVitalReading(vital)),
    );
    return { analyses };
  }

  @Post('patient-insight')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientInsight(
    @Body() body: { patientId: string; vitals: any[]; alerts: any[] },
  ) {
    const insight = await this.aiService.analyzePatientHistory(
      body.patientId,
      body.vitals,
      body.alerts,
    );
    return insight;
  }

  @Post('health-summary')
  async getHealthSummary(
    @Body() body: { vitals: any[]; alerts: any[] },
  ) {
    const summary = await this.aiService.generateHealthSummary(
      body.vitals,
      body.alerts,
    );
    return { summary };
  }
}
