import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Call, CallParticipant, CallRecording } from './entities/call.entity';
import { WebRTCService } from './webrtc.service';
import { WebRTCGateway } from './webrtc.gateway';
import { WebRTCController } from './webrtc.controller';

/**
 * WebRTC Module
 *
 * Provides comprehensive video calling functionality for VytalWatch RPM telehealth:
 * - Video/audio/screen-share calls
 * - WebSocket signaling server for WebRTC
 * - Call recording with HIPAA compliance
 * - Call history and statistics
 * - Connection quality monitoring
 * - Automatic reconnection handling
 *
 * Features:
 * - Peer-to-peer connections using WebRTC
 * - STUN/TURN server support for NAT traversal
 * - Real-time signaling via WebSockets
 * - Recording consent tracking
 * - Quality metrics and monitoring
 * - Integration with appointments and clinical notes
 * - Audit logging for HIPAA compliance
 *
 * Dependencies:
 * - @nestjs/websockets
 * - @nestjs/platform-socket.io
 * - socket.io
 * - uuid
 *
 * Install with:
 * npm install @nestjs/websockets @nestjs/platform-socket.io socket.io uuid
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Call, CallParticipant, CallRecording]),
    ConfigModule,
  ],
  controllers: [WebRTCController],
  providers: [WebRTCService, WebRTCGateway],
  exports: [WebRTCService, WebRTCGateway],
})
export class WebRTCModule {}
