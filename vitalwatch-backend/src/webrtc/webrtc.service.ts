import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  Call,
  CallParticipant,
  CallRecording,
  CallStatus,
  CallType,
  ParticipantStatus,
  RecordingStatus,
} from './entities/call.entity';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { AnswerCallDto } from './dto/answer-call.dto';
import { EndCallDto } from './dto/end-call.dto';
import { QueryCallsDto } from './dto/query-calls.dto';
import { StartRecordingDto } from './dto/start-recording.dto';

@Injectable()
export class WebRTCService {
  private readonly logger = new Logger(WebRTCService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(CallParticipant)
    private readonly participantRepository: Repository<CallParticipant>,
    @InjectRepository(CallRecording)
    private readonly recordingRepository: Repository<CallRecording>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate a new call
   */
  async initiateCall(
    dto: InitiateCallDto,
    initiatorId: string,
  ): Promise<Call> {
    try {
      // Validate participants are different
      if (dto.patientId === dto.providerId) {
        throw new BadRequestException(
          'Patient and provider must be different users',
        );
      }

      // Check if there's already an active call between these users
      const existingCall = await this.callRepository.findOne({
        where: {
          patientId: dto.patientId,
          providerId: dto.providerId,
          status: In([
            CallStatus.SCHEDULED,
            CallStatus.RINGING,
            CallStatus.IN_PROGRESS,
          ]),
        },
      });

      if (existingCall) {
        throw new BadRequestException(
          'There is already an active call between these participants',
        );
      }

      // Generate unique room ID
      const roomId = `room_${uuidv4()}`;

      // Get STUN/TURN servers from config
      const stunServers = this.getStunServers();
      const turnServers = this.getTurnServers();

      // Create call
      const call = this.callRepository.create({
        patientId: dto.patientId,
        providerId: dto.providerId,
        type: dto.type,
        scheduledAt: dto.scheduledAt || new Date(),
        status: dto.scheduledAt ? CallStatus.SCHEDULED : CallStatus.RINGING,
        roomId,
        initiatedBy: initiatorId,
        createdBy: initiatorId,
        appointmentId: dto.appointmentId,
        recordingEnabled: dto.recordingEnabled || false,
        recordingConsentObtained: dto.recordingConsentObtained || false,
        recordingConsentedBy: dto.recordingConsentedBy || [],
        isEncrypted: true,
        isHIPAACompliant: true,
        stunServers,
        turnServers,
        metadata: dto.metadata || {},
      });

      const savedCall = await this.callRepository.save(call);

      // Create call participants
      const participants = [dto.patientId, dto.providerId].map(
        (userId) =>
          this.participantRepository.create({
            callId: savedCall.id,
            userId,
            status: ParticipantStatus.INVITED,
            invitedAt: new Date(),
          }),
      );

      await this.participantRepository.save(participants);

      this.logger.log(
        `Call ${savedCall.id} initiated by ${initiatorId} between ${dto.patientId} and ${dto.providerId}`,
      );

      return this.getCall(savedCall.id, initiatorId);
    } catch (error) {
      this.logger.error(`Failed to initiate call: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(
    callId: string,
    userId: string,
    dto: AnswerCallDto,
  ): Promise<Call> {
    try {
      const call = await this.getCall(callId, userId);

      // Validate call can be answered
      if (call.status !== CallStatus.RINGING && call.status !== CallStatus.SCHEDULED) {
        throw new BadRequestException(
          `Cannot answer call in ${call.status} status`,
        );
      }

      // Validate user is a participant
      const participant = await this.participantRepository.findOne({
        where: { callId, userId },
      });

      if (!participant) {
        throw new ForbiddenException('User is not a participant in this call');
      }

      // Update call status
      call.status = CallStatus.IN_PROGRESS;
      call.startedAt = new Date();

      // Update participant status
      participant.status = ParticipantStatus.CONNECTED;
      participant.joinedAt = new Date();
      participant.videoEnabled = dto.videoEnabled ?? true;
      participant.audioEnabled = dto.audioEnabled ?? true;
      participant.consentedToRecording = dto.consentToRecording ?? false;

      if (dto.consentToRecording) {
        participant.consentedToRecordingAt = new Date();
      }

      await this.callRepository.save(call);
      await this.participantRepository.save(participant);

      this.logger.log(`Call ${callId} answered by ${userId}`);

      return this.getCall(callId, userId);
    } catch (error) {
      this.logger.error(`Failed to answer call: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(
    callId: string,
    userId: string,
    dto?: EndCallDto,
  ): Promise<Call> {
    try {
      const call = await this.getCall(callId, userId);

      // Validate call can be ended
      if (call.status === CallStatus.ENDED || call.status === CallStatus.CANCELLED) {
        throw new BadRequestException('Call is already ended');
      }

      // Calculate duration
      const endedAt = new Date();
      let duration = 0;
      let actualDuration = 0;

      if (call.scheduledAt) {
        duration = Math.floor(
          (endedAt.getTime() - call.scheduledAt.getTime()) / 1000,
        );
      }

      if (call.startedAt) {
        actualDuration = Math.floor(
          (endedAt.getTime() - call.startedAt.getTime()) / 1000,
        );
      }

      // Update call
      call.status = CallStatus.ENDED;
      call.endedAt = endedAt;
      call.endedBy = userId;
      call.endReason = dto?.reason || 'Call ended normally';
      call.duration = duration;
      call.actualDuration = actualDuration;

      await this.callRepository.save(call);

      // Update all participants to left status
      await this.participantRepository.update(
        { callId, status: ParticipantStatus.CONNECTED },
        {
          status: ParticipantStatus.LEFT,
          leftAt: endedAt,
        },
      );

      // Calculate participation duration for each participant
      const participants = await this.participantRepository.find({
        where: { callId },
      });

      for (const participant of participants) {
        if (participant.joinedAt && participant.leftAt) {
          participant.participationDuration = Math.floor(
            (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
          );
          await this.participantRepository.save(participant);
        }
      }

      // Stop any active recordings
      const activeRecordings = await this.recordingRepository.find({
        where: {
          callId,
          status: RecordingStatus.RECORDING,
        },
      });

      for (const recording of activeRecordings) {
        await this.stopRecording(callId, recording.id, userId);
      }

      this.logger.log(`Call ${callId} ended by ${userId}`);

      return this.getCall(callId, userId);
    } catch (error) {
      this.logger.error(`Failed to end call: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a specific call
   */
  async getCall(callId: string, userId: string): Promise<Call> {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['participants', 'recordings', 'patient', 'provider', 'initiator'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Verify user has access to this call
    if (
      call.patientId !== userId &&
      call.providerId !== userId &&
      call.initiatedBy !== userId
    ) {
      throw new ForbiddenException('Access denied to this call');
    }

    return call;
  }

  /**
   * Get call history
   */
  async getCallHistory(
    query: QueryCallsDto,
    userId: string,
  ): Promise<{ calls: Call[]; total: number }> {
    const where: any = {};

    // Filter by user (patient or provider)
    if (query.patientId) {
      where.patientId = query.patientId;
    } else if (query.providerId) {
      where.providerId = query.providerId;
    }

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by type
    if (query.type) {
      where.type = query.type;
    }

    // Filter by appointment
    if (query.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    // Filter by date range
    if (query.startDate && query.endDate) {
      where.createdAt = Between(query.startDate, query.endDate);
    } else if (query.startDate) {
      where.createdAt = Between(query.startDate, new Date());
    }

    const [calls, total] = await this.callRepository.findAndCount({
      where,
      relations: ['patient', 'provider', 'participants'],
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });

    return { calls, total };
  }

  /**
   * Get call statistics
   */
  async getCallStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = {};

    // Filter by user
    where.providerId = userId; // Assuming provider is viewing stats

    // Filter by date range
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    const calls = await this.callRepository.find({ where });

    // Calculate statistics
    const totalCalls = calls.length;
    const completedCalls = calls.filter(
      (c) => c.status === CallStatus.ENDED,
    ).length;
    const missedCalls = calls.filter(
      (c) => c.status === CallStatus.MISSED,
    ).length;
    const failedCalls = calls.filter(
      (c) => c.status === CallStatus.FAILED,
    ).length;
    const cancelledCalls = calls.filter(
      (c) => c.status === CallStatus.CANCELLED,
    ).length;

    const totalDuration = calls.reduce(
      (sum, call) => sum + (call.actualDuration || 0),
      0,
    );
    const averageDuration =
      completedCalls > 0 ? totalDuration / completedCalls : 0;

    // Call type breakdown
    const videoCallsCount = calls.filter(
      (c) => c.type === CallType.VIDEO,
    ).length;
    const audioCallsCount = calls.filter(
      (c) => c.type === CallType.AUDIO,
    ).length;
    const screenShareCount = calls.filter(
      (c) => c.type === CallType.SCREEN_SHARE,
    ).length;

    // Quality metrics
    const callsWithMetrics = calls.filter((c) => c.qualityMetrics);
    const avgBandwidth =
      callsWithMetrics.length > 0
        ? callsWithMetrics.reduce(
            (sum, c) => sum + (c.qualityMetrics?.averageBandwidth || 0),
            0,
          ) / callsWithMetrics.length
        : 0;

    const avgLatency =
      callsWithMetrics.length > 0
        ? callsWithMetrics.reduce(
            (sum, c) => sum + (c.qualityMetrics?.averageLatency || 0),
            0,
          ) / callsWithMetrics.length
        : 0;

    const avgPacketLoss =
      callsWithMetrics.length > 0
        ? callsWithMetrics.reduce(
            (sum, c) => sum + (c.qualityMetrics?.packetLoss || 0),
            0,
          ) / callsWithMetrics.length
        : 0;

    return {
      totalCalls,
      completedCalls,
      missedCalls,
      failedCalls,
      cancelledCalls,
      totalDuration,
      averageDuration,
      callTypeBreakdown: {
        video: videoCallsCount,
        audio: audioCallsCount,
        screenShare: screenShareCount,
      },
      qualityMetrics: {
        averageBandwidth: avgBandwidth,
        averageLatency: avgLatency,
        averagePacketLoss: avgPacketLoss,
      },
      fallbackRate:
        totalCalls > 0
          ? (calls.filter((c) => c.fellbackToAudio).length / totalCalls) * 100
          : 0,
    };
  }

  /**
   * Start recording a call
   */
  async startRecording(
    callId: string,
    userId: string,
    dto: StartRecordingDto,
  ): Promise<CallRecording> {
    try {
      const call = await this.getCall(callId, userId);

      // Validate call is in progress
      if (call.status !== CallStatus.IN_PROGRESS) {
        throw new BadRequestException('Call must be in progress to start recording');
      }

      // Validate consent
      if (!dto.consentObtained || dto.consentedParticipants.length === 0) {
        throw new BadRequestException(
          'Recording consent must be obtained from all participants',
        );
      }

      // Check if recording is already active
      const activeRecording = await this.recordingRepository.findOne({
        where: {
          callId,
          status: RecordingStatus.RECORDING,
        },
      });

      if (activeRecording) {
        throw new BadRequestException('Recording is already in progress');
      }

      // Create recording
      const recording = this.recordingRepository.create({
        callId,
        status: RecordingStatus.RECORDING,
        startedAt: new Date(),
        startedBy: userId,
        consentObtained: dto.consentObtained,
        consentedParticipants: dto.consentedParticipants,
        consentObtainedAt: new Date(),
        consentDetails: {
          method: dto.consentMethod,
          timestamp: new Date(),
          participantIds: dto.consentedParticipants,
        },
        isEncrypted: true,
        isHIPAACompliant: true,
        encryptionAlgorithm: 'AES-256-GCM',
        storageProvider: this.configService.get('storage.provider') || 'aws-s3',
        storageBucket: this.configService.get('storage.bucket'),
        storageRegion: this.configService.get('storage.region'),
        retentionPeriod: this.configService.get('recording.retentionDays') || 365,
        createdBy: userId,
      });

      const savedRecording = await this.recordingRepository.save(recording);

      // Update call to indicate recording is active
      call.recordingEnabled = true;
      call.recordingConsentObtained = true;
      call.recordingConsentedAt = new Date();
      call.recordingConsentedBy = dto.consentedParticipants;
      await this.callRepository.save(call);

      this.logger.log(`Recording started for call ${callId} by ${userId}`);

      return savedRecording;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Stop recording a call
   */
  async stopRecording(
    callId: string,
    recordingId: string,
    userId: string,
  ): Promise<CallRecording> {
    try {
      const recording = await this.recordingRepository.findOne({
        where: { id: recordingId, callId },
      });

      if (!recording) {
        throw new NotFoundException('Recording not found');
      }

      if (recording.status !== RecordingStatus.RECORDING) {
        throw new BadRequestException('Recording is not active');
      }

      // Update recording
      const stoppedAt = new Date();
      recording.status = RecordingStatus.PROCESSING;
      recording.stoppedAt = stoppedAt;
      recording.stoppedBy = userId;

      if (recording.startedAt) {
        recording.duration = Math.floor(
          (stoppedAt.getTime() - recording.startedAt.getTime()) / 1000,
        );
      }

      // Calculate expiration date based on retention period
      if (recording.retentionPeriod) {
        const expiresAt = new Date(stoppedAt);
        expiresAt.setDate(expiresAt.getDate() + recording.retentionPeriod);
        recording.expiresAt = expiresAt;
      }

      await this.recordingRepository.save(recording);

      this.logger.log(`Recording ${recordingId} stopped for call ${callId} by ${userId}`);

      return recording;
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recording for a call
   */
  async getRecording(
    callId: string,
    recordingId: string,
    userId: string,
  ): Promise<CallRecording> {
    const call = await this.getCall(callId, userId);

    const recording = await this.recordingRepository.findOne({
      where: { id: recordingId, callId },
      relations: ['call'],
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Update view tracking
    recording.viewCount += 1;
    recording.lastViewedAt = new Date();
    recording.lastViewedBy = userId;
    await this.recordingRepository.save(recording);

    return recording;
  }

  /**
   * Update call quality metrics
   */
  async updateCallQualityMetrics(
    callId: string,
    userId: string,
    metrics: {
      bandwidth?: number;
      latency?: number;
      packetLoss?: number;
      jitter?: number;
      videoResolution?: string;
      audioQuality?: 'excellent' | 'good' | 'fair' | 'poor';
      connectionType?: 'p2p' | 'relay';
    },
  ): Promise<void> {
    const call = await this.getCall(callId, userId);

    // Update or merge quality metrics
    call.qualityMetrics = {
      ...call.qualityMetrics,
      ...metrics,
    };

    await this.callRepository.save(call);

    this.logger.log(`Quality metrics updated for call ${callId}`);
  }

  /**
   * Handle call failure
   */
  async markCallAsFailed(
    callId: string,
    userId: string,
    failureReason: string,
    errorDetails?: Record<string, any>,
  ): Promise<Call> {
    const call = await this.getCall(callId, userId);

    call.status = CallStatus.FAILED;
    call.failureReason = failureReason;
    call.errorDetails = errorDetails;
    call.endedAt = new Date();
    call.endedBy = userId;

    await this.callRepository.save(call);

    this.logger.error(`Call ${callId} marked as failed: ${failureReason}`);

    return call;
  }

  /**
   * Handle call missed
   */
  async markCallAsMissed(callId: string, userId: string): Promise<Call> {
    const call = await this.getCall(callId, userId);

    call.status = CallStatus.MISSED;
    call.endedAt = new Date();

    await this.callRepository.save(call);

    this.logger.log(`Call ${callId} marked as missed`);

    return call;
  }

  /**
   * Cancel a scheduled call
   */
  async cancelCall(
    callId: string,
    userId: string,
    reason?: string,
  ): Promise<Call> {
    const call = await this.getCall(callId, userId);

    if (call.status !== CallStatus.SCHEDULED) {
      throw new BadRequestException('Can only cancel scheduled calls');
    }

    call.status = CallStatus.CANCELLED;
    call.endReason = reason || 'Call cancelled';
    call.endedBy = userId;
    call.endedAt = new Date();

    await this.callRepository.save(call);

    this.logger.log(`Call ${callId} cancelled by ${userId}`);

    return call;
  }

  /**
   * Get STUN servers from configuration
   */
  private getStunServers(): string[] {
    const stunServers = this.configService.get('webrtc.stunServers');
    if (stunServers) {
      return stunServers;
    }

    // Default public STUN servers
    return [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ];
  }

  /**
   * Get TURN servers from configuration
   */
  private getTurnServers(): string[] {
    const turnServers = this.configService.get('webrtc.turnServers');
    if (turnServers) {
      return turnServers;
    }

    // In production, you should configure your own TURN servers
    return [];
  }
}
