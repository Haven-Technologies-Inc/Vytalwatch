import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WebRTCService } from './webrtc.service';
import {
  WebRTCSignalDto,
  SignalType,
  JoinCallDto,
  LeaveCallDto,
  UpdateMediaDto,
  ConnectionQualityDto,
} from './dto/webrtc-signal.dto';
import { CallStatus, ParticipantStatus } from './entities/call.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallParticipant } from './entities/call.entity';

/**
 * WebRTC Signaling Server Gateway
 *
 * Handles WebSocket connections for WebRTC signaling including:
 * - SDP offer/answer exchange
 * - ICE candidate exchange
 * - Call state management
 * - Room management
 * - Connection quality monitoring
 * - Automatic reconnection handling
 *
 * Install dependencies:
 * npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
 */
@WebSocketGateway({
  namespace: 'webrtc',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class WebRTCGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRTCGateway.name);

  // Map of user ID to their socket IDs
  private readonly userSockets = new Map<string, Set<string>>();

  // Map of socket ID to user ID
  private readonly socketUsers = new Map<string, string>();

  // Map of call ID to room participants
  private readonly callRooms = new Map<string, Set<string>>();

  // Connection quality monitoring intervals
  private readonly qualityMonitors = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly webrtcService: WebRTCService,
    @InjectRepository(CallParticipant)
    private readonly participantRepository: Repository<CallParticipant>,
  ) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      const userId = this.extractUserIdFromSocket(client);

      if (!userId) {
        this.logger.warn(`Connection rejected - no valid user ID`);
        client.disconnect();
        return;
      }

      // Store socket connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);
      this.socketUsers.set(client.id, userId);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(
        `WebRTC: User ${userId} connected with socket ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: Socket) {
    try {
      const userId = this.socketUsers.get(client.id);

      if (userId) {
        // Remove socket from user's set
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(client.id);

          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }

        this.socketUsers.delete(client.id);

        // Handle participant leaving any active calls
        await this.handleUnexpectedDisconnection(userId);

        this.logger.log(
          `WebRTC: User ${userId} disconnected socket ${client.id}`,
        );
      }
    } catch (error) {
      this.logger.error(`Disconnection error: ${error.message}`);
    }
  }

  /**
   * Handle WebRTC signaling (offer, answer, ICE candidates)
   */
  @SubscribeMessage('signal')
  async handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { callId, type, payload, targetUserId } = data;

      // Validate user is part of the call
      const call = await this.webrtcService.getCall(callId, userId);

      if (!call) {
        client.emit('error', { message: 'Call not found' });
        return;
      }

      this.logger.log(
        `Signal ${type} from ${userId} for call ${callId}`,
      );

      // Forward signal to target user or room
      if (targetUserId) {
        // Send to specific user
        this.emitToUser(targetUserId, 'signal', {
          callId,
          type,
          payload,
          fromUserId: userId,
        });
      } else {
        // Broadcast to all participants in the call room except sender
        client.to(`call:${callId}`).emit('signal', {
          callId,
          type,
          payload,
          fromUserId: userId,
        });
      }
    } catch (error) {
      this.logger.error(`Signal error: ${error.message}`);
      client.emit('error', { message: 'Failed to process signal' });
    }
  }

  /**
   * Handle SDP offer
   */
  @SubscribeMessage('offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; offer: any; targetUserId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId, offer, targetUserId } = data;

      this.logger.log(`Offer from ${userId} to ${targetUserId} for call ${callId}`);

      // Forward offer to target user
      this.emitToUser(targetUserId, 'offer', {
        callId,
        offer,
        fromUserId: userId,
      });
    } catch (error) {
      this.logger.error(`Offer error: ${error.message}`);
      client.emit('error', { message: 'Failed to send offer' });
    }
  }

  /**
   * Handle SDP answer
   */
  @SubscribeMessage('answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; answer: any; targetUserId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId, answer, targetUserId } = data;

      this.logger.log(`Answer from ${userId} to ${targetUserId} for call ${callId}`);

      // Forward answer to target user
      this.emitToUser(targetUserId, 'answer', {
        callId,
        answer,
        fromUserId: userId,
      });
    } catch (error) {
      this.logger.error(`Answer error: ${error.message}`);
      client.emit('error', { message: 'Failed to send answer' });
    }
  }

  /**
   * Handle ICE candidate
   */
  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { callId: string; candidate: any; targetUserId?: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId, candidate, targetUserId } = data;

      this.logger.debug(
        `ICE candidate from ${userId} for call ${callId}`,
      );

      if (targetUserId) {
        // Send to specific user
        this.emitToUser(targetUserId, 'ice-candidate', {
          callId,
          candidate,
          fromUserId: userId,
        });
      } else {
        // Broadcast to call room
        client.to(`call:${callId}`).emit('ice-candidate', {
          callId,
          candidate,
          fromUserId: userId,
        });
      }
    } catch (error) {
      this.logger.error(`ICE candidate error: ${error.message}`);
    }
  }

  /**
   * Handle participant joining a call
   */
  @SubscribeMessage('join-call')
  async handleJoinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinCallDto,
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { callId, videoEnabled, audioEnabled } = data;

      // Validate user is part of the call
      const call = await this.webrtcService.getCall(callId, userId);

      if (!call) {
        client.emit('error', { message: 'Call not found or access denied' });
        return;
      }

      // Join call room
      client.join(`call:${callId}`);

      // Track room participants
      if (!this.callRooms.has(callId)) {
        this.callRooms.set(callId, new Set());
      }
      this.callRooms.get(callId).add(userId);

      // Update participant status
      const participant = await this.participantRepository.findOne({
        where: { callId, userId },
      });

      if (participant) {
        participant.status = ParticipantStatus.JOINING;
        participant.socketId = client.id;
        participant.videoEnabled = videoEnabled ?? true;
        participant.audioEnabled = audioEnabled ?? true;
        participant.ipAddress = client.handshake.address;
        participant.userAgent = client.handshake.headers['user-agent'];
        await this.participantRepository.save(participant);
      }

      // Notify other participants
      client.to(`call:${callId}`).emit('participant-joined', {
        callId,
        userId,
        videoEnabled,
        audioEnabled,
      });

      // Send current participants to the joining user
      const roomParticipants = Array.from(this.callRooms.get(callId) || []);
      client.emit('room-participants', {
        callId,
        participants: roomParticipants.filter((id) => id !== userId),
      });

      // Start connection quality monitoring
      this.startQualityMonitoring(callId, userId);

      this.logger.log(`User ${userId} joined call ${callId}`);
    } catch (error) {
      this.logger.error(`Join call error: ${error.message}`);
      client.emit('error', { message: 'Failed to join call' });
    }
  }

  /**
   * Handle participant leaving a call
   */
  @SubscribeMessage('leave-call')
  async handleLeaveCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveCallDto,
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId, reason } = data;

      // Leave call room
      client.leave(`call:${callId}`);

      // Remove from room participants
      if (this.callRooms.has(callId)) {
        this.callRooms.get(callId).delete(userId);
        if (this.callRooms.get(callId).size === 0) {
          this.callRooms.delete(callId);
        }
      }

      // Update participant status
      const participant = await this.participantRepository.findOne({
        where: { callId, userId },
      });

      if (participant && participant.status === ParticipantStatus.CONNECTED) {
        participant.status = ParticipantStatus.LEFT;
        participant.leftAt = new Date();
        participant.disconnectionReason = reason;

        if (participant.joinedAt) {
          participant.participationDuration = Math.floor(
            (new Date().getTime() - participant.joinedAt.getTime()) / 1000,
          );
        }

        await this.participantRepository.save(participant);
      }

      // Stop quality monitoring
      this.stopQualityMonitoring(callId, userId);

      // Notify other participants
      client.to(`call:${callId}`).emit('participant-left', {
        callId,
        userId,
        reason,
      });

      this.logger.log(`User ${userId} left call ${callId}`);
    } catch (error) {
      this.logger.error(`Leave call error: ${error.message}`);
    }
  }

  /**
   * Handle media state updates (video/audio enabled/disabled)
   */
  @SubscribeMessage('update-media')
  async handleUpdateMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateMediaDto,
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId, videoEnabled, audioEnabled, screenShareEnabled } = data;

      // Update participant media state
      const participant = await this.participantRepository.findOne({
        where: { callId, userId },
      });

      if (participant) {
        if (videoEnabled !== undefined) participant.videoEnabled = videoEnabled;
        if (audioEnabled !== undefined) participant.audioEnabled = audioEnabled;
        if (screenShareEnabled !== undefined)
          participant.screenShareEnabled = screenShareEnabled;

        await this.participantRepository.save(participant);
      }

      // Notify other participants
      client.to(`call:${callId}`).emit('participant-media-updated', {
        callId,
        userId,
        videoEnabled,
        audioEnabled,
        screenShareEnabled,
      });

      this.logger.log(
        `Media updated for user ${userId} in call ${callId}`,
      );
    } catch (error) {
      this.logger.error(`Update media error: ${error.message}`);
    }
  }

  /**
   * Handle connection quality updates
   */
  @SubscribeMessage('connection-quality')
  async handleConnectionQuality(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ConnectionQualityDto,
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId, metrics } = data;

      // Update participant connection quality
      const participant = await this.participantRepository.findOne({
        where: { callId, userId },
      });

      if (participant) {
        participant.connectionQuality = metrics;
        await this.participantRepository.save(participant);
      }

      // Update call-level quality metrics
      await this.webrtcService.updateCallQualityMetrics(
        callId,
        userId,
        metrics,
      );

      // Check for quality issues and handle fallback if needed
      if (metrics.packetLoss && metrics.packetLoss > 10) {
        // High packet loss detected
        this.logger.warn(
          `High packet loss (${metrics.packetLoss}%) detected for user ${userId} in call ${callId}`,
        );

        // Suggest audio-only fallback
        client.emit('quality-warning', {
          callId,
          warning: 'high-packet-loss',
          suggestion: 'Consider switching to audio-only mode',
          metrics,
        });
      }

      if (metrics.latency && metrics.latency > 300) {
        // High latency detected
        this.logger.warn(
          `High latency (${metrics.latency}ms) detected for user ${userId} in call ${callId}`,
        );

        client.emit('quality-warning', {
          callId,
          warning: 'high-latency',
          suggestion: 'Poor connection quality detected',
          metrics,
        });
      }
    } catch (error) {
      this.logger.error(`Connection quality error: ${error.message}`);
    }
  }

  /**
   * Handle reconnection attempt
   */
  @SubscribeMessage('reconnect-call')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { callId } = data;

      const participant = await this.participantRepository.findOne({
        where: { callId, userId },
      });

      if (participant) {
        participant.reconnectionAttempts =
          (participant.reconnectionCount || 0) + 1;
        participant.lastDisconnectedAt = new Date();
        await this.participantRepository.save(participant);
      }

      // Rejoin the call
      await this.handleJoinCall(client, { callId });

      this.logger.log(
        `User ${userId} reconnecting to call ${callId} (attempt ${participant?.reconnectionAttempts || 1})`,
      );
    } catch (error) {
      this.logger.error(`Reconnect error: ${error.message}`);
      client.emit('error', { message: 'Failed to reconnect' });
    }
  }

  /**
   * Emit incoming call notification
   */
  emitIncomingCall(userId: string, callData: any) {
    this.emitToUser(userId, 'incoming-call', callData);
    this.logger.log(`Incoming call notification sent to user ${userId}`);
  }

  /**
   * Emit call ended notification
   */
  emitCallEnded(callId: string, reason?: string) {
    this.server.to(`call:${callId}`).emit('call-ended', {
      callId,
      reason,
      timestamp: new Date(),
    });
    this.logger.log(`Call ended notification sent for call ${callId}`);
  }

  /**
   * Emit call cancelled notification
   */
  emitCallCancelled(userId: string, callId: string, reason?: string) {
    this.emitToUser(userId, 'call-cancelled', {
      callId,
      reason,
      timestamp: new Date(),
    });
  }

  // Helper methods

  /**
   * Extract user ID from socket connection
   */
  private extractUserIdFromSocket(client: Socket): string | null {
    // Option 1: From auth token (recommended for production)
    const token = client.handshake.auth?.token;
    if (token) {
      // TODO: Validate and decode JWT token
      // const decoded = this.jwtService.verify(token);
      // return decoded.userId;
    }

    // Option 2: From query params (for development/testing only)
    const userId = client.handshake.query?.userId as string;
    if (userId) {
      return userId;
    }

    return null;
  }

  /**
   * Check if user is currently online
   */
  private isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId).size > 0
    );
  }

  /**
   * Emit event to a specific user (all their connected sockets)
   */
  private emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Handle unexpected disconnection
   */
  private async handleUnexpectedDisconnection(userId: string) {
    try {
      // Find all active calls for this user
      const activeParticipants = await this.participantRepository.find({
        where: {
          userId,
          status: ParticipantStatus.CONNECTED,
        },
      });

      for (const participant of activeParticipants) {
        const callId = participant.callId;

        // Update participant status
        participant.status = ParticipantStatus.DISCONNECTED;
        participant.disconnectionCount += 1;
        participant.lastDisconnectedAt = new Date();
        participant.disconnectionReason = 'Unexpected disconnection';
        await this.participantRepository.save(participant);

        // Notify other participants
        this.server.to(`call:${callId}`).emit('participant-disconnected', {
          callId,
          userId,
          timestamp: new Date(),
        });

        // Clean up room tracking
        if (this.callRooms.has(callId)) {
          this.callRooms.get(callId).delete(userId);
        }

        // Stop quality monitoring
        this.stopQualityMonitoring(callId, userId);

        this.logger.warn(
          `User ${userId} unexpectedly disconnected from call ${callId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling unexpected disconnection: ${error.message}`,
      );
    }
  }

  /**
   * Start connection quality monitoring
   */
  private startQualityMonitoring(callId: string, userId: string) {
    const monitorKey = `${callId}:${userId}`;

    // Clear existing monitor if any
    this.stopQualityMonitoring(callId, userId);

    // Monitor quality every 10 seconds
    const interval = setInterval(() => {
      this.emitToUser(userId, 'request-quality-stats', { callId });
    }, 10000);

    this.qualityMonitors.set(monitorKey, interval);
  }

  /**
   * Stop connection quality monitoring
   */
  private stopQualityMonitoring(callId: string, userId: string) {
    const monitorKey = `${callId}:${userId}`;

    if (this.qualityMonitors.has(monitorKey)) {
      clearInterval(this.qualityMonitors.get(monitorKey));
      this.qualityMonitors.delete(monitorKey);
    }
  }
}
