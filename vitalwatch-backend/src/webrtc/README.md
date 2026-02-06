# WebRTC Video Call System for VytalWatch RPM Telehealth

A complete WebRTC-based video calling system with signaling server, recording capabilities, and HIPAA compliance for remote patient monitoring telehealth.

## Features

### Core Functionality
- **Video Calls**: High-quality peer-to-peer video calls
- **Audio Calls**: Audio-only mode for bandwidth-constrained connections
- **Screen Sharing**: Share screens during clinical consultations
- **Recording**: HIPAA-compliant call recording with consent tracking
- **Call Management**: Schedule, initiate, answer, and end calls
- **Call History**: Complete audit trail of all calls

### Technical Features
- **WebSocket Signaling**: Real-time WebRTC signaling server using Socket.IO
- **ICE/STUN/TURN**: Full support for NAT traversal and firewall penetration
- **Peer-to-Peer**: Direct P2P connections for optimal performance
- **Connection Quality Monitoring**: Real-time bandwidth, latency, and packet loss tracking
- **Automatic Reconnection**: Handles network interruptions gracefully
- **Audio-Only Fallback**: Automatic fallback when video quality is poor
- **Multi-Device Support**: Users can connect from multiple devices

### Security & Compliance
- **End-to-End Encryption**: All media streams are encrypted
- **HIPAA Compliant**: Full audit logging and secure storage
- **Recording Consent**: Track and enforce recording consent from all participants
- **Access Control**: Role-based access to calls and recordings
- **Secure Storage**: Encrypted storage for recordings with configurable retention

## Installation

### Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io uuid
```

### Configuration

Add to your `.env` file:

```env
# WebRTC Configuration
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
WEBRTC_TURN_SERVERS=turn:your-turn-server.com:3478
WEBRTC_TURN_USERNAME=your-turn-username
WEBRTC_TURN_PASSWORD=your-turn-password

# Recording Storage
STORAGE_PROVIDER=aws-s3
STORAGE_BUCKET=vytalwatch-call-recordings
STORAGE_REGION=us-east-1
RECORDING_RETENTION_DAYS=365

# Frontend URL for CORS
FRONTEND_URL=https://your-frontend-url.com
```

Add to your `config/configuration.ts`:

```typescript
export default () => ({
  webrtc: {
    stunServers: process.env.WEBRTC_STUN_SERVERS?.split(',') || [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
    ],
    turnServers: process.env.WEBRTC_TURN_SERVERS?.split(',') || [],
    turnUsername: process.env.WEBRTC_TURN_USERNAME,
    turnPassword: process.env.WEBRTC_TURN_PASSWORD,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'aws-s3',
    bucket: process.env.STORAGE_BUCKET,
    region: process.env.STORAGE_REGION || 'us-east-1',
  },
  recording: {
    retentionDays: parseInt(process.env.RECORDING_RETENTION_DAYS) || 365,
  },
});
```

### Module Import

Add to your `app.module.ts`:

```typescript
import { WebRTCModule } from './webrtc/webrtc.module';

@Module({
  imports: [
    // ... other imports
    WebRTCModule,
  ],
})
export class AppModule {}
```

### Database Migration

Run migrations to create the required tables:

```bash
npm run migration:generate -- -n CreateWebRTCTables
npm run migration:run
```

## API Endpoints

### REST API

#### Initiate a Call
```http
POST /webrtc/calls
Content-Type: application/json

{
  "patientId": "uuid",
  "providerId": "uuid",
  "type": "video",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "appointmentId": "uuid",
  "recordingEnabled": false
}
```

#### Get Call History
```http
GET /webrtc/calls?patientId=uuid&limit=20&offset=0
```

#### Get Call Details
```http
GET /webrtc/calls/:id
```

#### Answer a Call
```http
POST /webrtc/calls/:id/answer
Content-Type: application/json

{
  "videoEnabled": true,
  "audioEnabled": true,
  "consentToRecording": true
}
```

#### End a Call
```http
POST /webrtc/calls/:id/end
Content-Type: application/json

{
  "reason": "Call completed"
}
```

#### Cancel a Scheduled Call
```http
POST /webrtc/calls/:id/cancel
Content-Type: application/json

{
  "reason": "Patient unavailable"
}
```

#### Start Recording
```http
POST /webrtc/calls/:id/record
Content-Type: application/json

{
  "consentObtained": true,
  "consentedParticipants": ["uuid1", "uuid2"],
  "consentMethod": "verbal",
  "enableTranscription": false
}
```

#### Stop Recording
```http
POST /webrtc/calls/:id/recordings/:recordingId/stop
```

#### Get Recording
```http
GET /webrtc/calls/:id/recordings/:recordingId
```

#### Get Call Statistics
```http
GET /webrtc/stats?startDate=2024-01-01&endDate=2024-01-31
```

### WebSocket Events

Connect to WebSocket namespace:
```javascript
const socket = io('https://api.vytalwatch.com/webrtc', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Client → Server Events

**Join a Call**
```javascript
socket.emit('join-call', {
  callId: 'uuid',
  videoEnabled: true,
  audioEnabled: true
});
```

**Leave a Call**
```javascript
socket.emit('leave-call', {
  callId: 'uuid',
  reason: 'User left'
});
```

**Send SDP Offer**
```javascript
socket.emit('offer', {
  callId: 'uuid',
  offer: rtcPeerConnection.localDescription,
  targetUserId: 'uuid'
});
```

**Send SDP Answer**
```javascript
socket.emit('answer', {
  callId: 'uuid',
  answer: rtcPeerConnection.localDescription,
  targetUserId: 'uuid'
});
```

**Send ICE Candidate**
```javascript
socket.emit('ice-candidate', {
  callId: 'uuid',
  candidate: iceCandidate,
  targetUserId: 'uuid'
});
```

**Update Media State**
```javascript
socket.emit('update-media', {
  callId: 'uuid',
  videoEnabled: false,
  audioEnabled: true,
  screenShareEnabled: false
});
```

**Send Connection Quality**
```javascript
socket.emit('connection-quality', {
  callId: 'uuid',
  metrics: {
    bandwidth: 1500, // kbps
    latency: 45, // ms
    packetLoss: 0.5, // percentage
    jitter: 12, // ms
    videoResolution: '1280x720'
  }
});
```

**Reconnect to Call**
```javascript
socket.emit('reconnect-call', {
  callId: 'uuid'
});
```

#### Server → Client Events

**Incoming Call**
```javascript
socket.on('incoming-call', (data) => {
  // data: { callId, callType, from, roomId, scheduledAt }
});
```

**Call Answered**
```javascript
socket.on('call-answered', (data) => {
  // data: { callId, answeredBy, timestamp }
});
```

**Call Ended**
```javascript
socket.on('call-ended', (data) => {
  // data: { callId, reason, timestamp }
});
```

**Call Cancelled**
```javascript
socket.on('call-cancelled', (data) => {
  // data: { callId, reason, timestamp }
});
```

**Participant Joined**
```javascript
socket.on('participant-joined', (data) => {
  // data: { callId, userId, videoEnabled, audioEnabled }
});
```

**Participant Left**
```javascript
socket.on('participant-left', (data) => {
  // data: { callId, userId, reason }
});
```

**Participant Disconnected**
```javascript
socket.on('participant-disconnected', (data) => {
  // data: { callId, userId, timestamp }
});
```

**Room Participants**
```javascript
socket.on('room-participants', (data) => {
  // data: { callId, participants: ['userId1', 'userId2'] }
});
```

**Receive Offer**
```javascript
socket.on('offer', async (data) => {
  // data: { callId, offer, fromUserId }
  await rtcPeerConnection.setRemoteDescription(data.offer);
  // Create and send answer
});
```

**Receive Answer**
```javascript
socket.on('answer', async (data) => {
  // data: { callId, answer, fromUserId }
  await rtcPeerConnection.setRemoteDescription(data.answer);
});
```

**Receive ICE Candidate**
```javascript
socket.on('ice-candidate', async (data) => {
  // data: { callId, candidate, fromUserId }
  await rtcPeerConnection.addIceCandidate(data.candidate);
});
```

**Participant Media Updated**
```javascript
socket.on('participant-media-updated', (data) => {
  // data: { callId, userId, videoEnabled, audioEnabled, screenShareEnabled }
});
```

**Quality Warning**
```javascript
socket.on('quality-warning', (data) => {
  // data: { callId, warning, suggestion, metrics }
});
```

**Request Quality Stats**
```javascript
socket.on('request-quality-stats', (data) => {
  // Request to send quality metrics
  // Respond with 'connection-quality' event
});
```

**Recording Started**
```javascript
socket.on('recording-started', (data) => {
  // data: { callId, recordingId, startedBy, timestamp }
});
```

**Recording Stopped**
```javascript
socket.on('recording-stopped', (data) => {
  // data: { callId, recordingId, stoppedBy, timestamp }
});
```

## Frontend Integration Example

### Basic WebRTC Setup

```typescript
import { io } from 'socket.io-client';

class WebRTCClient {
  private socket: any;
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream;
  private remoteStream: MediaStream;

  constructor(private apiUrl: string, private token: string) {
    this.socket = io(`${apiUrl}/webrtc`, {
      auth: { token }
    });

    this.setupSocketListeners();
  }

  // Initialize WebRTC
  async initialize() {
    // Get user media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers from API
      ]
    });

    // Add local stream tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      // Update UI with remote stream
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          callId: this.currentCallId,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection quality
    this.startQualityMonitoring();
  }

  // Join a call
  async joinCall(callId: string) {
    this.currentCallId = callId;

    // Join call room
    this.socket.emit('join-call', {
      callId,
      videoEnabled: true,
      audioEnabled: true
    });
  }

  // Create and send offer
  async createOffer(targetUserId: string) {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit('offer', {
      callId: this.currentCallId,
      offer: offer,
      targetUserId
    });
  }

  // Handle incoming offer
  async handleOffer(offer: RTCSessionDescriptionInit, fromUserId: string) {
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('answer', {
      callId: this.currentCallId,
      answer: answer,
      targetUserId: fromUserId
    });
  }

  // Monitor connection quality
  private startQualityMonitoring() {
    setInterval(async () => {
      const stats = await this.peerConnection.getStats();
      const metrics = this.parseStats(stats);

      this.socket.emit('connection-quality', {
        callId: this.currentCallId,
        metrics
      });
    }, 10000);
  }

  private setupSocketListeners() {
    this.socket.on('offer', (data) => {
      this.handleOffer(data.offer, data.fromUserId);
    });

    this.socket.on('answer', async (data) => {
      await this.peerConnection.setRemoteDescription(data.answer);
    });

    this.socket.on('ice-candidate', async (data) => {
      await this.peerConnection.addIceCandidate(data.candidate);
    });

    this.socket.on('participant-joined', (data) => {
      // New participant joined, create offer
      this.createOffer(data.userId);
    });

    this.socket.on('quality-warning', (data) => {
      // Show quality warning to user
      console.warn('Connection quality issue:', data);
    });
  }
}
```

## Architecture

### Components

1. **WebRTC Controller** (`webrtc.controller.ts`)
   - REST API endpoints for call management
   - Recording management
   - Statistics and reporting

2. **WebRTC Service** (`webrtc.service.ts`)
   - Business logic for calls
   - Recording management
   - Quality metrics tracking
   - Call history and statistics

3. **WebRTC Gateway** (`webrtc.gateway.ts`)
   - WebSocket signaling server
   - Real-time connection management
   - ICE candidate exchange
   - Quality monitoring

4. **Entities**
   - `Call`: Main call entity
   - `CallParticipant`: Participant tracking
   - `CallRecording`: Recording management

### Flow Diagrams

#### Call Initiation Flow
```
1. Provider initiates call via REST API
2. Server creates call record
3. Server sends WebSocket notification to patient
4. Patient receives incoming-call event
5. Patient joins call via WebSocket
6. WebRTC signaling begins (SDP exchange)
7. ICE candidates exchanged
8. P2P connection established
9. Media streams flowing
```

#### Recording Flow
```
1. Provider requests recording start via REST API
2. Server validates consent from all participants
3. Recording starts
4. All participants notified via WebSocket
5. Recording indicator shown in UI
6. Provider stops recording via REST API
7. Recording processed and stored
8. Recording available for playback
```

## Best Practices

### STUN/TURN Configuration
- Use multiple STUN servers for redundancy
- Configure TURN servers for NAT traversal in restricted networks
- Use credentials for TURN server authentication
- Monitor TURN server usage and costs

### Recording Compliance
- Always obtain explicit consent before recording
- Track consent from all participants
- Store recordings encrypted at rest
- Implement retention policies
- Provide audit logs for compliance

### Quality Management
- Monitor connection quality in real-time
- Implement automatic fallback to audio-only
- Provide quality indicators to users
- Log quality metrics for analysis

### Security
- Use HTTPS/WSS for all connections
- Validate JWT tokens for WebSocket connections
- Encrypt recordings at rest
- Implement role-based access control
- Audit all access to recordings

### Performance
- Use P2P connections when possible
- Fall back to TURN relay only when necessary
- Optimize video resolution based on bandwidth
- Implement connection recovery mechanisms

## Troubleshooting

### Connection Issues
- Verify STUN/TURN server configuration
- Check firewall and NAT settings
- Ensure WebSocket connection is established
- Monitor ICE candidate gathering

### Audio/Video Issues
- Verify media device permissions
- Check browser compatibility
- Monitor quality metrics
- Implement fallback mechanisms

### Recording Issues
- Verify storage configuration
- Check consent tracking
- Monitor storage capacity
- Validate encryption setup

## Future Enhancements

- [ ] Multi-party video calls (group calls)
- [ ] Screen sharing with annotation
- [ ] Real-time transcription
- [ ] AI-powered clinical note generation
- [ ] Waiting room functionality
- [ ] Virtual backgrounds
- [ ] Recording highlights and bookmarks
- [ ] Integration with EHR systems
- [ ] Mobile app support (iOS/Android)
- [ ] Bandwidth adaptive streaming

## License

Proprietary - VytalWatch RPM Platform
