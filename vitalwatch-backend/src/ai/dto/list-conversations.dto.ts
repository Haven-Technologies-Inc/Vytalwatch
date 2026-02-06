import { IsOptional, IsEnum, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AIConversationType } from '../entities/ai-conversation.entity';

export class ListConversationsDto {
  @IsEnum(AIConversationType)
  @IsOptional()
  type?: AIConversationType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  archived?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  pinned?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
