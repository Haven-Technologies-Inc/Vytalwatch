import { Test, TestingModule } from '@nestjs/testing';
import { WebRTCService } from '../src/webrtc/webrtc.service';
import { AuditService } from '../src/audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WebRTCService', () => {
  let service: WebRTCService;
  let auditService: AuditService;

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebRTCService,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<WebRTCService>(WebRTCService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('should create a new WebRTC room', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
        maxDuration: 60,
      };

      // Act
      const result = await service.createRoom(roomData);

      // Assert
      expect(result).toBeDefined();
      expect(result.roomId).toBeDefined();
      expect(result.hostId).toBe('provider-456');
      expect(result.participantId).toBe('patient-123');
      expect(result.status).toBe('created');
    });

    it('should generate unique room ID', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      // Act
      const room1 = await service.createRoom(roomData);
      const room2 = await service.createRoom(roomData);

      // Assert
      expect(room1.roomId).not.toBe(room2.roomId);
    });

    it('should create audit log for room creation', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      // Act
      await service.createRoom(roomData);

      // Assert
      expect(auditService.log).toHaveBeenCalledWith({
        action: 'WEBRTC_ROOM_CREATED',
        userId: 'provider-456',
        resourceType: 'webrtc_room',
        resourceId: expect.any(String),
        details: expect.any(Object),
      });
    });
  });

  describe('joinRoom', () => {
    it('should allow participant to join room', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);

      // Act
      const result = await service.joinRoom(room.roomId, 'patient-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.roomId).toBe(room.roomId);
      expect(result.status).toBe('active');
      expect(result.participants).toContain('patient-123');
    });

    it('should throw NotFoundException if room does not exist', async () => {
      // Act & Assert
      await expect(service.joinRoom('non-existent-room', 'patient-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if unauthorized user tries to join', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);

      // Act & Assert
      await expect(service.joinRoom(room.roomId, 'unauthorized-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('leaveRoom', () => {
    it('should allow participant to leave room', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.joinRoom(room.roomId, 'patient-123');

      // Act
      const result = await service.leaveRoom(room.roomId, 'patient-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.participants).not.toContain('patient-123');
    });

    it('should end room when host leaves', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.joinRoom(room.roomId, 'provider-456');

      // Act
      const result = await service.leaveRoom(room.roomId, 'provider-456');

      // Assert
      expect(result.status).toBe('ended');
      expect(result.endedAt).toBeDefined();
    });
  });

  describe('exchangeSignal', () => {
    it('should exchange WebRTC signaling data', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      const signalData = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\n...',
      };

      // Act
      const result = await service.exchangeSignal(
        room.roomId,
        'provider-456',
        'patient-123',
        signalData,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle ICE candidate exchange', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      const iceCandidate = {
        type: 'ice-candidate',
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      // Act
      const result = await service.exchangeSignal(
        room.roomId,
        'provider-456',
        'patient-123',
        iceCandidate,
      );

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('getRoomStatus', () => {
    it('should return room status and statistics', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.joinRoom(room.roomId, 'provider-456');
      await service.joinRoom(room.roomId, 'patient-123');

      // Act
      const result = await service.getRoomStatus(room.roomId);

      // Assert
      expect(result).toBeDefined();
      expect(result.roomId).toBe(room.roomId);
      expect(result.status).toBe('active');
      expect(result.participants).toHaveLength(2);
      expect(result.duration).toBeDefined();
    });
  });

  describe('recordSession', () => {
    it('should start recording session', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);

      // Act
      const result = await service.recordSession(room.roomId, 'provider-456', {
        withConsent: true,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.recording).toBe(true);
      expect(result.recordingStartedAt).toBeDefined();
    });

    it('should throw error if recording without consent', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);

      // Act & Assert
      await expect(
        service.recordSession(room.roomId, 'provider-456', { withConsent: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should stop recording session', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.recordSession(room.roomId, 'provider-456', { withConsent: true });

      // Act
      const result = await service.stopRecording(room.roomId, 'provider-456');

      // Assert
      expect(result.recording).toBe(false);
      expect(result.recordingStoppedAt).toBeDefined();
      expect(result.recordingUrl).toBeDefined();
    });
  });

  describe('getConnectionQuality', () => {
    it('should return connection quality metrics', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.joinRoom(room.roomId, 'patient-123');

      // Act
      const result = await service.getConnectionQuality(room.roomId, 'patient-123');

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('bitrate');
      expect(result).toHaveProperty('packetLoss');
      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('quality');
    });
  });

  describe('muteParticipant', () => {
    it('should mute participant audio', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.joinRoom(room.roomId, 'patient-123');

      // Act
      const result = await service.muteParticipant(room.roomId, 'provider-456', 'patient-123', {
        audio: true,
        video: false,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.audioMuted).toBe(true);
      expect(result.videoMuted).toBe(false);
    });

    it('should only allow host to mute others', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);

      // Act & Assert
      await expect(
        service.muteParticipant(room.roomId, 'patient-123', 'provider-456', { audio: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRoomStatistics', () => {
    it('should return comprehensive room statistics', async () => {
      // Arrange
      const roomData = {
        appointmentId: 'appt-123',
        hostId: 'provider-456',
        participantId: 'patient-123',
      };

      const room = await service.createRoom(roomData);
      await service.joinRoom(room.roomId, 'provider-456');
      await service.joinRoom(room.roomId, 'patient-123');

      // Wait a bit for statistics to accumulate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act
      const result = await service.getRoomStatistics(room.roomId);

      // Assert
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.participantCount).toBe(2);
      expect(result.peakParticipants).toBeGreaterThanOrEqual(2);
      expect(result.totalDataTransferred).toBeDefined();
    });
  });
});
