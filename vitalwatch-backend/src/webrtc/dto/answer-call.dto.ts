import { IsBoolean, IsOptional } from 'class-validator';

export class AnswerCallDto {
  @IsOptional()
  @IsBoolean()
  videoEnabled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  consentToRecording?: boolean = false;
}
