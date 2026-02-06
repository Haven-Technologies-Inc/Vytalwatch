import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

export class AttachmentDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File URL or path' })
  @IsString()
  url: string;
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    maxLength: 10000,
  })
  @IsString()
  @MaxLength(10000)
  content: string;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({
    description: 'File attachments',
    type: [AttachmentDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];

  @ApiProperty({
    description: 'Reply to message ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  replyToMessageId?: string;

  @ApiProperty({
    description: 'Priority level',
    enum: ['low', 'normal', 'high', 'urgent'],
    required: false,
  })
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  @IsOptional()
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiProperty({
    description: 'User IDs mentioned in the message',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  mentions?: string[];
}
