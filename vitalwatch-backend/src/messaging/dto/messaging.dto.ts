import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsUUID,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({
    description: 'Array of participant user IDs (UUIDs)',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ description: 'Thread subject', example: 'Question about medication' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Hello, I have a question.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'Array of attachment URLs or file IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
