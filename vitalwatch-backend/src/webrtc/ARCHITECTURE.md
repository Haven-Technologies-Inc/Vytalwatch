# WebRTC Video Call System Architecture

## System Overview

The VytalWatch WebRTC video call system provides production-ready telehealth video calling with the following components:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Video UI     │  │ WebRTC       │  │ Socket.IO Client    │  │
│  │ Components   │  │ Integration  │  │ (Signaling)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              WebRTC Module                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Controller   │  │ Service      │  │ Gateway      │   │  │
│  │  │ (REST API)   │  │ (Business    │  │ (WebSocket   │   │  │
│  │  │              │  │  Logic)      │  │  Signaling)  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              TypeORM (Database Layer)                     │  │
│  │  ┌──────────┐  ┌────────────────┐  ┌──────────────────┐ │  │
│  │  │ Call     │  │ CallParticipant│  │ CallRecording    │ │  │
│  │  │ Entity   │  │ Entity         │  │ Entity           │ │  │
│  │  └──────────┘  └────────────────┘  └──────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                        │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ calls      │  │ call_participants│  │ call_recordings  │    │
│  └────────────┘  └─────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ STUN/TURN    │  │ Storage      │  │ Transcription       │  │
│  │ Servers      │  │ (S3/Azure)   │  │ Service (Optional)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. WebRTC Controller (`webrtc.controller.ts`)

**Responsibility**: REST API endpoints for call management

**Key Endpoints**:
- `POST /webrtc/calls` - Initiate a new call
- `GET /webrtc/calls` - Get call history
- `GET /webrtc/calls/:id` - Get call details
- `POST /webrtc/calls/:id/answer` - Answer a call
- `POST /webrtc/calls/:id/end` - End a call
- `POST /webrtc/calls/:id/record` - Start recording
- `GET /webrtc/calls/:id/recordings` - Get recordings
- `GET /webrtc/stats` - Get statistics

**Dependencies**:
- WebRTCService (business logic)
- WebRTCGateway (real-time notifications)

### 2. WebRTC Service (`webrtc.service.ts`)

**Responsibility**: Business logic for call management

**Key Methods**:
```typescript
// Call Management
initiateCall(dto, userId): Promise<Call>
answerCall(callId, userId, dto): Promise<Call>
endCall(callId, userId, dto): Promise<Call>
cancelCall(callId, userId, reason): Promise<Call>
getCall(callId, userId): Promise<Call>
getCallHistory(query, userId): Promise<{calls, total}>

// Recording Management
startRecording(callId, userId, dto): Promise<CallRecording>
stopRecording(callId, recordingId, userId): Promise<CallRecording>
getRecording(callId, recordingId, userId): Promise<CallRecording>

// Quality & Statistics
updateCallQualityMetrics(callId, userId, metrics): Promise<void>
getCallStatistics(userId, startDate, endDate): Promise<Statistics>
markCallAsFailed(callId, userId, reason, details): Promise<Call>
markCallAsMissed(callId, userId): Promise<Call>
```

**Features**:
- Call lifecycle management
- Participant tracking
- Recording with consent tracking
- Quality metrics collection
- HIPAA compliance enforcement
- Audit logging

### 3. WebRTC Gateway (`webrtc.gateway.ts`)

**Responsibility**: WebSocket signaling server for real-time communication

**WebSocket Namespace**: `/webrtc`

**Key Events (Client → Server)**:
```typescript
// Connection Management
'join-call' - Join a call room
'leave-call' - Leave a call room
'reconnect-call' - Reconnect after disconnection

// WebRTC Signaling
'offer' - Send SDP offer
'answer' - Send SDP answer
'ice-candidate' - Send ICE candidate

// Media Control
'update-media' - Update video/audio/screen state

// Quality Monitoring
'connection-quality' - Report connection metrics
```

**Key Events (Server → Client)**:
```typescript
// Call Notifications
'incoming-call' - Notify user of incoming call
'call-answered' - Call was answered
'call-ended' - Call has ended
'call-cancelled' - Call was cancelled

// Participant Events
'participant-joined' - Participant joined
'participant-left' - Participant left
'participant-disconnected' - Unexpected disconnect
'participant-media-updated' - Media state changed

// Signaling
'offer' - Receive SDP offer
'answer' - Receive SDP answer
'ice-candidate' - Receive ICE candidate

// Room Management
'room-participants' - List of current participants

// Quality
'quality-warning' - Quality issue detected
'request-quality-stats' - Request quality report

// Recording
'recording-started' - Recording started
'recording-stopped' - Recording stopped

// Errors
'error' - Error occurred
```

**Features**:
- Real-time signaling
- Connection management
- Automatic reconnection
- Quality monitoring
- Room management
- Participant tracking

### 4. Data Models

#### Call Entity
```typescript
{
  id: string (UUID)
  patientId: string
  providerId: string
  type: CallType (VIDEO, AUDIO, SCREEN_SHARE)
  status: CallStatus (SCHEDULED, RINGING, IN_PROGRESS, ENDED, etc.)
  roomId: string (unique room identifier)
  scheduledAt?: Date
  startedAt?: Date
  endedAt?: Date
  duration?: number (seconds)
  actualDuration?: number (seconds)
  qualityMetrics?: QualityMetrics
  recordingEnabled: boolean
  recordingConsentObtained: boolean
  isEncrypted: boolean
  isHIPAACompliant: boolean
  // ... more fields
}
```

#### CallParticipant Entity
```typescript
{
  id: string (UUID)
  callId: string
  userId: string
  status: ParticipantStatus (INVITED, JOINING, CONNECTED, etc.)
  joinedAt?: Date
  leftAt?: Date
  participationDuration?: number (seconds)
  videoEnabled: boolean
  audioEnabled: boolean
  screenShareEnabled: boolean
  connectionQuality?: QualityMetrics
  consentedToRecording: boolean
  // ... more fields
}
```

#### CallRecording Entity
```typescript
{
  id: string (UUID)
  callId: string
  status: RecordingStatus (PENDING, RECORDING, COMPLETED, etc.)
  fileName?: string
  filePath?: string
  fileUrl?: string (presigned URL)
  fileSize?: number (bytes)
  duration?: number (seconds)
  consentObtained: boolean
  consentedParticipants: string[]
  isEncrypted: boolean
  isHIPAACompliant: boolean
  storageProvider: string
  retentionPeriod: number (days)
  expiresAt?: Date
  // ... more fields
}
```

## Data Flow

### Call Initiation Flow

```
1. Provider → REST API: POST /webrtc/calls
                        ↓
2. Controller → Service: initiateCall()
                        ↓
3. Service → Database: Create Call + Participants
                        ↓
4. Service → Gateway: emitIncomingCall()
                        ↓
5. Gateway → Patient: 'incoming-call' event
                        ↓
6. Patient → Gateway: 'join-call' event
                        ↓
7. Gateway → Provider: 'participant-joined' event
                        ↓
8. WebRTC Signaling: SDP offer/answer exchange
                        ↓
9. ICE Candidate Exchange
                        ↓
10. P2P Connection Established
                        ↓
11. Media Streaming Begins
```

### Recording Flow

```
1. Provider → REST API: POST /webrtc/calls/:id/record
                        ↓
2. Service: Validate consent from all participants
                        ↓
3. Service → Database: Create CallRecording
                        ↓
4. Service → Gateway: Notify participants
                        ↓
5. Gateway → All: 'recording-started' event
                        ↓
6. Recording Service: Capture media streams
                        ↓
7. Storage Service: Upload to S3/Azure/GCP
                        ↓
8. Provider → REST API: POST /stop-recording
                        ↓
9. Service: Update recording status
                        ↓
10. Storage: Finalize and encrypt file
                        ↓
11. Database: Update recording metadata
```

### Quality Monitoring Flow

```
1. Client: Collect connection stats
           (every 10 seconds)
                        ↓
2. Client → Gateway: 'connection-quality' event
                        ↓
3. Gateway → Service: updateCallQualityMetrics()
                        ↓
4. Service → Database: Store quality metrics
                        ↓
5. Service: Analyze metrics
                        ↓
6. If poor quality detected:
   Gateway → Client: 'quality-warning' event
                        ↓
7. Client: Suggest fallback to audio-only
```

## Security Architecture

### Authentication & Authorization

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ JWT Token
       ▼
┌──────────────────────────────┐
│   Auth Middleware            │
│   - Validate JWT             │
│   - Extract user ID          │
│   - Check permissions        │
└──────┬───────────────────────┘
       │ Authenticated Request
       ▼
┌──────────────────────────────┐
│   WebRTC Controller/Gateway  │
│   - Verify user is           │
│     patient or provider      │
│   - Check call access        │
└──────────────────────────────┘
```

### Encryption Layers

1. **Transport Layer**: HTTPS/WSS (TLS 1.3)
2. **WebRTC Media**: DTLS-SRTP (mandatory encryption)
3. **Storage**: AES-256-GCM for recordings at rest
4. **Database**: Encrypted columns for sensitive data

### HIPAA Compliance

```
┌─────────────────────────────────────┐
│     HIPAA Compliance Measures       │
├─────────────────────────────────────┤
│ ✓ Encrypted transmission (TLS)     │
│ ✓ Encrypted storage (AES-256)      │
│ ✓ Access control (RBAC)            │
│ ✓ Audit logging (all actions)      │
│ ✓ Consent tracking (recordings)    │
│ ✓ Data retention policies          │
│ ✓ Secure disposal (auto-delete)    │
│ ✓ BAA with cloud providers         │
└─────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

```
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
       │
   ┌───┴───┬───────┬────────┐
   ▼       ▼       ▼        ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│App 1│ │App 2│ │App 3│ │App N│
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │       │       │        │
   └───┬───┴───┬───┴────┬───┘
       ▼       ▼        ▼
   ┌────────────────────────┐
   │    Redis (Sessions)    │
   └────────────────────────┘
```

**Key Points**:
- Use Redis for WebSocket session management
- Sticky sessions for WebSocket connections
- Shared database for call state
- Message queue for async tasks

### Performance Optimization

1. **Database**:
   - Connection pooling
   - Indexed queries
   - Materialized views for statistics
   - Partitioning for large tables

2. **WebSocket**:
   - Connection pooling
   - Message batching
   - Binary protocols
   - Compression

3. **Media**:
   - P2P connections (no server relay)
   - Adaptive bitrate
   - Quality-based fallback
   - Efficient codec selection

## Monitoring & Observability

### Key Metrics

```
┌─────────────────────────────────────┐
│         Application Metrics         │
├─────────────────────────────────────┤
│ • Active calls count                │
│ • Calls initiated/hour              │
│ • Call success rate                 │
│ • Average call duration             │
│ • Recording success rate            │
│ • Storage usage                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         Quality Metrics             │
├─────────────────────────────────────┤
│ • Average bandwidth                 │
│ • Average latency                   │
│ • Packet loss rate                  │
│ • Connection failure rate           │
│ • P2P vs TURN usage                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         System Metrics              │
├─────────────────────────────────────┤
│ • CPU usage                         │
│ • Memory usage                      │
│ • Database connections              │
│ • WebSocket connections             │
│ • API response times                │
└─────────────────────────────────────┘
```

### Logging

```typescript
// Structured logging format
{
  timestamp: "2024-01-15T10:00:00Z",
  level: "info",
  component: "WebRTCService",
  action: "call_initiated",
  callId: "uuid",
  userId: "uuid",
  metadata: {
    type: "video",
    participants: 2
  }
}
```

### Alerts

- Call failure rate > 5%
- Recording failure rate > 1%
- Average latency > 300ms
- Storage usage > 80%
- TURN server failures

## Disaster Recovery

### Backup Strategy

1. **Database**: Daily automated backups with point-in-time recovery
2. **Recordings**: Multi-region replication
3. **Configuration**: Version controlled and backed up

### Failure Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| App server down | Active calls dropped | Load balancer redirects, clients reconnect |
| Database down | Can't create new calls | Failover to replica |
| TURN server down | Some calls may fail | Fallback to alternative TURN servers |
| Storage down | Can't save recordings | Queue for retry, alert ops |
| Network partition | Calls may degrade | TURN relay fallback |

## Cost Optimization

### TURN Server Usage

- Use STUN first (free)
- Fall back to TURN only when necessary (~10-20% of calls)
- Monitor TURN bandwidth usage
- Consider self-hosted TURN servers

### Storage Costs

- Implement retention policies
- Auto-delete expired recordings
- Use lifecycle policies (S3 Glacier)
- Compress recordings

### Bandwidth

- Adaptive bitrate reduces bandwidth
- Audio-only fallback reduces costs
- P2P connections save server bandwidth

## Future Enhancements

1. **Multi-party Calls**: Support for >2 participants
2. **SFU Architecture**: Selective Forwarding Unit for group calls
3. **Recording Transcription**: Automatic speech-to-text
4. **AI Features**: Clinical note generation, medical term detection
5. **Mobile SDKs**: Native iOS/Android support
6. **Screen Annotation**: Drawing tools during screen share
7. **Virtual Backgrounds**: Privacy and professionalism
8. **Waiting Room**: Virtual waiting room with queue management

## References

- [WebRTC Standards](https://www.w3.org/TR/webrtc/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [STUN/TURN Protocols](https://tools.ietf.org/html/rfc5389)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
