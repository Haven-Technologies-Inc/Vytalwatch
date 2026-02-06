import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { AIConversationType } from '../entities/ai-conversation.entity';

export class CreateConversationDto {
  @IsString()
  title: string;

  @IsEnum(AIConversationType)
  @IsOptional()
  type?: AIConversationType;

  @IsString()
  @IsOptional()
  context?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  patientId?: string;

  @IsString()
  @IsOptional()
  vitalReadingId?: string;

  @IsString()
  @IsOptional()
  alertId?: string;

  @IsBoolean()
  @IsOptional()
  containsPHI?: boolean;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @Max(32000)
  @IsOptional()
  maxTokens?: number;

  @IsBoolean()
  @IsOptional()
  streamingEnabled?: boolean;
}
