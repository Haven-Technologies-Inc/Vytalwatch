import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { ChartingAssistantService } from './charting-assistant.service';
import { RiskScoringService } from './risk-scoring.service';
import { AdvancedAIController } from './advanced-ai.controller';
import { AIModel } from './entities/ai-model.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AIModel])],
  controllers: [AIController, AdvancedAIController],
  providers: [AIService, ChartingAssistantService, RiskScoringService],
  exports: [AIService, ChartingAssistantService, RiskScoringService],
})
export class AIModule {}
