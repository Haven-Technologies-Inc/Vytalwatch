import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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

  // General Insights (dashboard summary)
  @Get('insights')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getGeneralInsights() {
    return this.aiService.getGeneralInsights();
  }

  // Patient Insights
  @Get('insights/:patientId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientInsights(@Param('patientId') patientId: string) {
    return this.aiService.getPatientInsights(patientId);
  }

  // Risk Prediction
  @Post('predict-risk')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async predictRisk(
    @Body() body: { patientId: string; vitals?: any[]; conditions?: string[] },
  ) {
    return this.aiService.predictRisk(body);
  }

  // Recommendations
  @Get('recommendations/:patientId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getRecommendations(
    @Param('patientId') patientId: string,
    @Query('type') type?: string,
  ) {
    return this.aiService.getRecommendations(patientId, type);
  }

  // Model Management
  @Post('train')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async trainModel(
    @Body() body: { modelType: string; trainingData?: any; parameters?: any },
  ) {
    return this.aiService.trainModel(body);
  }

  @Get('models')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getModels(@Query('status') status?: string) {
    return this.aiService.getModels(status);
  }

  @Get('models/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getModel(@Param('id') id: string) {
    return this.aiService.getModel(id);
  }

  @Post('models/:id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async activateModel(@Param('id') id: string) {
    return this.aiService.activateModel(id);
  }

  @Post('models/:id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivateModel(@Param('id') id: string) {
    return this.aiService.deactivateModel(id);
  }

  // Provider Status (real connectivity check)
  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStatus() {
    return this.aiService.getProviderStatus();
  }

  // Performance Metrics
  @Get('performance-metrics')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPerformanceMetrics(
    @Query('modelId') modelId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiService.getPerformanceMetrics({ modelId, startDate, endDate });
  }

  // Batch Analysis
  @Post('batch-analyze')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async batchAnalyze(
    @Body() body: { patientIds: string[]; analysisType: string },
  ) {
    return this.aiService.batchAnalyze(body);
  }

  // Real-time Analysis
  @Post('real-time')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async realTimeAnalysis(
    @Body() body: { vitalReading: any; patientId: string },
  ) {
    return this.aiService.realTimeAnalysis(body);
  }
}
