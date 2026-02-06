import { IsOptional, IsNumber, Min, Max, IsString, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType, MessageStatus } from '../entities/message.entity';

export class QueryMessagesDto {
  @ApiProperty({
    description: 'Page number',
    default: 1,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    default: 50,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;

  @ApiProperty({
    description: 'Search query',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by message type',
    enum: MessageType,
    required: false,
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({
    description: 'Filter by message status',
    enum: MessageStatus,
    required: false,
  })
  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @ApiProperty({
    description: 'Filter messages after this date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  afterDate?: string;

  @ApiProperty({
    description: 'Filter messages before this date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  beforeDate?: string;
}
