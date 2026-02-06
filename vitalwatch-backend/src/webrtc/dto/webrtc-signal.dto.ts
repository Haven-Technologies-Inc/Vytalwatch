import { IsString, IsUUID, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum SignalType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
}

export class WebRTCSignalDto {
  @IsUUID()
  callId: string;

  @IsEnum(SignalType)
  type: SignalType;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  targetUserId?: string;
}

export class JoinCallDto {
  @IsUUID()
  callId: string;

  @IsOptional()
  @IsString()
  videoEnabled?: boolean = true;

  @IsOptional()
  @IsString()
  audioEnabled?: boolean = true;
}

export class LeaveCallDto {
  @IsUUID()
  callId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateMediaDto {
  @IsUUID()
  callId: string;

  @IsOptional()
  @IsString()
  videoEnabled?: boolean;

  @IsOptional()
  @IsString()
  audioEnabled?: boolean;

  @IsOptional()
  @IsString()
  screenShareEnabled?: boolean;
}

export class ConnectionQualityDto {
  @IsUUID()
  callId: string;

  @IsObject()
  metrics: {
    bandwidth?: number;
    latency?: number;
    packetLoss?: number;
    jitter?: number;
    videoResolution?: string;
  };
}
