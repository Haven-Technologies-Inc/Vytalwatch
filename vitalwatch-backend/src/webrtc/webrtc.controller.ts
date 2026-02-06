import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WebRTCService } from './webrtc.service';
import { WebRTCGateway } from './webrtc.gateway';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { AnswerCallDto } from './dto/answer-call.dto';
import { EndCallDto } from './dto/end-call.dto';
import { QueryCallsDto } from './dto/query-calls.dto';
import { StartRecordingDto } from './dto/start-recording.dto';
import { Call, CallRecording } from './entities/call.entity';

/**
 * WebRTC Controller
 *
 * Provides REST API endpoints for WebRTC video call management:
 * - Initiating calls
 * - Answering calls
 * - Ending calls
 * - Managing recordings
 * - Call history and statistics
 */
@Controller('webrtc')
// @UseGuards(AuthGuard) // Uncomment when implementing authentication
export class WebRTCController {
  constructor(
    private readonly webrtcService: WebRTCService,
    private readonly webrtcGateway: WebRTCGateway,
  ) {}

  /**
   * POST /webrtc/calls - Initiate a new call
   */
  @Post('calls')
  @HttpCode(HttpStatus.CREATED)
  async initiateCall(
    @Body() dto: InitiateCallDto,
    @Request() req: any,
  ): Promise<Call> {
    // TODO: Extract user ID from authenticated request
    const initiatorId = req.user?.id || dto.providerId; // Temporary fallback

    const call = await this.webrtcService.initiateCall(dto, initiatorId);

    // Notify the recipient about incoming call
    const recipientId =
      initiatorId === dto.patientId ? dto.providerId : dto.patientId;

    this.webrtcGateway.emitIncomingCall(recipientId, {
      callId: call.id,
      callType: call.type,
      from: initiatorId,
      roomId: call.roomId,
      scheduledAt: call.scheduledAt,
    });

    return call;
  }

  /**
   * GET /webrtc/calls - Get call history
   */
  @Get('calls')
  async getCallHistory(
    @Query() query: QueryCallsDto,
    @Request() req: any,
  ): Promise<{ calls: Call[]; total: number }> {
    const userId = req.user?.id || query.patientId || query.providerId;

    return this.webrtcService.getCallHistory(query, userId);
  }

  /**
   * GET /webrtc/calls/:id - Get specific call details
   */
  @Get('calls/:id')
  async getCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @Request() req: any,
  ): Promise<Call> {
    const userId = req.user?.id;

    return this.webrtcService.getCall(callId, userId);
  }

  /**
   * POST /webrtc/calls/:id/answer - Answer an incoming call
   */
  @Post('calls/:id/answer')
  @HttpCode(HttpStatus.OK)
  async answerCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @Body() dto: AnswerCallDto,
    @Request() req: any,
  ): Promise<Call> {
    const userId = req.user?.id;

    const call = await this.webrtcService.answerCall(callId, userId, dto);

    // Notify the initiator that the call was answered
    const initiatorId = call.initiatedBy;
    this.webrtcGateway.emitToUser(initiatorId, 'call-answered', {
      callId: call.id,
      answeredBy: userId,
      timestamp: new Date(),
    });

    return call;
  }

  /**
   * POST /webrtc/calls/:id/end - End an active call
   */
  @Post('calls/:id/end')
  @HttpCode(HttpStatus.OK)
  async endCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @Body() dto: EndCallDto,
    @Request() req: any,
  ): Promise<Call> {
    const userId = req.user?.id;

    const call = await this.webrtcService.endCall(callId, userId, dto);

    // Notify all participants that the call ended
    this.webrtcGateway.emitCallEnded(callId, dto?.reason);

    return call;
  }

  /**
   * POST /webrtc/calls/:id/cancel - Cancel a scheduled call
   */
  @Post('calls/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @Body() dto: EndCallDto,
    @Request() req: any,
  ): Promise<Call> {
    const userId = req.user?.id;

    const call = await this.webrtcService.cancelCall(
      callId,
      userId,
      dto?.reason,
    );

    // Notify participants about cancellation
    const recipientId =
      userId === call.patientId ? call.providerId : call.patientId;
    this.webrtcGateway.emitCallCancelled(recipientId, callId, dto?.reason);

    return call;
  }

  /**
   * POST /webrtc/calls/:id/missed - Mark call as missed
   */
  @Post('calls/:id/missed')
  @HttpCode(HttpStatus.OK)
  async markCallAsMissed(
    @Param('id', ParseUUIDPipe) callId: string,
    @Request() req: any,
  ): Promise<Call> {
    const userId = req.user?.id;

    return this.webrtcService.markCallAsMissed(callId, userId);
  }

  /**
   * POST /webrtc/calls/:id/record - Start recording a call
   */
  @Post('calls/:id/record')
  @HttpCode(HttpStatus.CREATED)
  async startRecording(
    @Param('id', ParseUUIDPipe) callId: string,
    @Body() dto: StartRecordingDto,
    @Request() req: any,
  ): Promise<CallRecording> {
    const userId = req.user?.id;

    const recording = await this.webrtcService.startRecording(
      callId,
      userId,
      dto,
    );

    // Notify all participants that recording started
    this.webrtcGateway.server.to(`call:${callId}`).emit('recording-started', {
      callId,
      recordingId: recording.id,
      startedBy: userId,
      timestamp: recording.startedAt,
    });

    return recording;
  }

  /**
   * POST /webrtc/calls/:id/recordings/:recordingId/stop - Stop recording
   */
  @Post('calls/:id/recordings/:recordingId/stop')
  @HttpCode(HttpStatus.OK)
  async stopRecording(
    @Param('id', ParseUUIDPipe) callId: string,
    @Param('recordingId', ParseUUIDPipe) recordingId: string,
    @Request() req: any,
  ): Promise<CallRecording> {
    const userId = req.user?.id;

    const recording = await this.webrtcService.stopRecording(
      callId,
      recordingId,
      userId,
    );

    // Notify all participants that recording stopped
    this.webrtcGateway.server.to(`call:${callId}`).emit('recording-stopped', {
      callId,
      recordingId: recording.id,
      stoppedBy: userId,
      timestamp: recording.stoppedAt,
    });

    return recording;
  }

  /**
   * GET /webrtc/calls/:id/recordings/:recordingId - Get recording
   */
  @Get('calls/:id/recordings/:recordingId')
  async getRecording(
    @Param('id', ParseUUIDPipe) callId: string,
    @Param('recordingId', ParseUUIDPipe) recordingId: string,
    @Request() req: any,
  ): Promise<CallRecording> {
    const userId = req.user?.id;

    return this.webrtcService.getRecording(callId, recordingId, userId);
  }

  /**
   * GET /webrtc/calls/:id/recordings - Get all recordings for a call
   */
  @Get('calls/:id/recordings')
  async getCallRecordings(
    @Param('id', ParseUUIDPipe) callId: string,
    @Request() req: any,
  ): Promise<CallRecording[]> {
    const userId = req.user?.id;

    const call = await this.webrtcService.getCall(callId, userId);
    return call.recordings || [];
  }

  /**
   * GET /webrtc/stats - Get call statistics
   */
  @Get('stats')
  async getCallStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ): Promise<any> {
    const userId = req.user?.id;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.webrtcService.getCallStatistics(userId, start, end);
  }

  /**
   * PATCH /webrtc/calls/:id/quality - Update call quality metrics
   */
  @Patch('calls/:id/quality')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateQualityMetrics(
    @Param('id', ParseUUIDPipe) callId: string,
    @Body()
    metrics: {
      bandwidth?: number;
      latency?: number;
      packetLoss?: number;
      jitter?: number;
      videoResolution?: string;
      audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
      connectionType?: 'p2p' | 'relay';
    },
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.id;

    await this.webrtcService.updateCallQualityMetrics(callId, userId, metrics);
  }

  /**
   * POST /webrtc/calls/:id/failed - Mark call as failed
   */
  @Post('calls/:id/failed')
  @HttpCode(HttpStatus.OK)
  async markCallAsFailed(
    @Param('id', ParseUUIDPipe) callId: string,
    @Body() body: { reason: string; errorDetails?: Record<string, any> },
    @Request() req: any,
  ): Promise<Call> {
    const userId = req.user?.id;

    return this.webrtcService.markCallAsFailed(
      callId,
      userId,
      body.reason,
      body.errorDetails,
    );
  }
}
