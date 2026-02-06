import { IsBoolean, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';

export class StartRecordingDto {
  @IsBoolean()
  consentObtained: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  consentedParticipants: string[];

  @IsEnum(['verbal', 'written', 'electronic'])
  consentMethod: 'verbal' | 'written' | 'electronic';

  @IsOptional()
  @IsBoolean()
  enableTranscription?: boolean = false;
}
