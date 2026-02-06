import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  archived?: boolean;

  @IsBoolean()
  @IsOptional()
  pinned?: boolean;

  @IsBoolean()
  @IsOptional()
  sharedWithProvider?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sharedWithUserIds?: string[];
}
