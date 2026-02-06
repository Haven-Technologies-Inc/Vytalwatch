import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Patient user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Provider user ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  providerId: string;

  @ApiProperty({
    description: 'Initial message content (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  initialMessage?: string;

  @ApiProperty({
    description: 'Conversation subject (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({
    description: 'Priority level',
    enum: ['low', 'normal', 'high', 'urgent'],
    required: false,
    default: 'normal',
  })
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}
