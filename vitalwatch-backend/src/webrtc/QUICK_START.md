# WebRTC Quick Start Guide

Get your WebRTC video call system up and running in minutes.

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] PostgreSQL 13+ running
- [ ] NPM or Yarn package manager
- [ ] SSL certificate (for production)

## 5-Minute Setup (Development)

### Step 1: Install Dependencies (1 minute)

```bash
cd vitalwatch-backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io uuid
```

### Step 2: Run Database Migrations (1 minute)

```bash
# Generate migration
npm run typeorm migration:generate -- -n CreateWebRTCTables

# Run migration
npm run typeorm migration:run
```

### Step 3: Configure Environment (1 minute)

Add to your `.env` file:

```env
# Basic configuration (works out of the box)
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302
FRONTEND_URL=http://localhost:3001
```

### Step 4: Start Server (1 minute)

```bash
npm run start:dev
```

### Step 5: Test API (1 minute)

```bash
# Create a test call
curl -X POST http://localhost:3000/webrtc/calls \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-uuid",
    "providerId": "test-provider-uuid",
    "type": "video"
  }'
```

✅ **Done!** Your WebRTC system is running.

## Quick Frontend Integration

### Install Socket.IO Client

```bash
npm install socket.io-client
```

### Basic WebRTC Client (TypeScript/React)

```typescript
import { io } from 'socket.io-client';

// 1. Connect to signaling server
const socket = io('http://localhost:3000/webrtc', {
  auth: { token: 'your-jwt-token' }
});

// 2. Create peer connection
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 3. Get user media
const localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// 4. Add tracks to peer connection
localStream.getTracks().forEach(track => {
  peerConnection.addTrack(track, localStream);
});

// 5. Handle incoming call
socket.on('incoming-call', async (data) => {
  console.log('Incoming call from:', data.from);

  // Join the call
  socket.emit('join-call', {
    callId: data.callId,
    videoEnabled: true,
    audioEnabled: true
  });
});

// 6. Handle offer
socket.on('offer', async (data) => {
  await peerConnection.setRemoteDescription(data.offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('answer', {
    callId: data.callId,
    answer: answer,
    targetUserId: data.fromUserId
  });
});

// 7. Handle answer
socket.on('answer', async (data) => {
  await peerConnection.setRemoteDescription(data.answer);
});

// 8. Handle ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice-candidate', {
      callId: currentCallId,
      candidate: event.candidate
    });
  }
};

socket.on('ice-candidate', async (data) => {
  await peerConnection.addIceCandidate(data.candidate);
});

// 9. Handle remote stream
peerConnection.ontrack = (event) => {
  const remoteVideo = document.getElementById('remote-video');
  remoteVideo.srcObject = event.streams[0];
};

// 10. Display local video
const localVideo = document.getElementById('local-video');
localVideo.srcObject = localStream;
```

## Common Use Cases

### Use Case 1: Schedule a Call

```typescript
// REST API call
const response = await fetch('http://localhost:3000/webrtc/calls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    patientId: 'patient-uuid',
    providerId: 'provider-uuid',
    type: 'video',
    scheduledAt: '2024-01-15T10:00:00Z',
    appointmentId: 'appointment-uuid'
  })
});

const call = await response.json();
console.log('Call scheduled:', call.id);
```

### Use Case 2: Start Recording

```typescript
// During an active call
const response = await fetch(`http://localhost:3000/webrtc/calls/${callId}/record`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    consentObtained: true,
    consentedParticipants: ['patient-uuid', 'provider-uuid'],
    consentMethod: 'verbal'
  })
});

const recording = await response.json();
console.log('Recording started:', recording.id);
```

### Use Case 3: Get Call History

```typescript
const response = await fetch(
  'http://localhost:3000/webrtc/calls?patientId=patient-uuid&limit=10',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { calls, total } = await response.json();
console.log(`Found ${total} calls:`, calls);
```

### Use Case 4: Monitor Call Quality

```typescript
// Collect stats every 10 seconds
setInterval(async () => {
  const stats = await peerConnection.getStats();

  let bandwidth = 0;
  let latency = 0;
  let packetLoss = 0;

  stats.forEach(report => {
    if (report.type === 'inbound-rtp') {
      bandwidth = report.bytesReceived / report.timestamp;
      packetLoss = report.packetsLost / report.packetsReceived * 100;
    }
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      latency = report.currentRoundTripTime * 1000;
    }
  });

  // Send to server
  socket.emit('connection-quality', {
    callId: currentCallId,
    metrics: { bandwidth, latency, packetLoss }
  });
}, 10000);
```

## React Component Example

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function VideoCall({ callId, token }) {
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  useEffect(() => {
    initializeCall();
    return () => cleanup();
  }, []);

  const initializeCall = async () => {
    // Connect to signaling server
    const socketConnection = io('http://localhost:3000/webrtc', {
      auth: { token }
    });
    setSocket(socketConnection);

    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideoRef.current.srcObject = stream;

    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketConnection.emit('ice-candidate', {
          callId,
          candidate: event.candidate
        });
      }
    };

    setPeerConnection(pc);

    // Join call
    socketConnection.emit('join-call', {
      callId,
      videoEnabled: true,
      audioEnabled: true
    });

    // Setup listeners
    setupSocketListeners(socketConnection, pc);
  };

  const setupSocketListeners = (socket, pc) => {
    socket.on('offer', async (data) => {
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', {
        callId,
        answer,
        targetUserId: data.fromUserId
      });
    });

    socket.on('answer', async (data) => {
      await pc.setRemoteDescription(data.answer);
    });

    socket.on('ice-candidate', async (data) => {
      await pc.addIceCandidate(data.candidate);
    });

    socket.on('participant-joined', async (data) => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', {
        callId,
        offer,
        targetUserId: data.userId
      });
    });
  };

  const toggleVideo = () => {
    const videoTrack = localVideoRef.current.srcObject
      .getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoEnabled(videoTrack.enabled);

    socket.emit('update-media', {
      callId,
      videoEnabled: videoTrack.enabled
    });
  };

  const toggleAudio = () => {
    const audioTrack = localVideoRef.current.srcObject
      .getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsAudioEnabled(audioTrack.enabled);

    socket.emit('update-media', {
      callId,
      audioEnabled: audioTrack.enabled
    });
  };

  const endCall = () => {
    socket.emit('leave-call', { callId });
    cleanup();
  };

  const cleanup = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks()
        .forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (socket) {
      socket.disconnect();
    }
  };

  return (
    <div className="video-call">
      <div className="video-container">
        <video ref={remoteVideoRef} autoPlay className="remote-video" />
        <video ref={localVideoRef} autoPlay muted className="local-video" />
      </div>
      <div className="controls">
        <button onClick={toggleVideo}>
          {isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
        </button>
        <button onClick={toggleAudio}>
          {isAudioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button onClick={endCall} className="end-call">
          End Call
        </button>
      </div>
    </div>
  );
}

export default VideoCall;
```

## Testing Checklist

- [ ] Can create a call via REST API
- [ ] WebSocket connection establishes
- [ ] Can join a call room
- [ ] SDP offer/answer exchange works
- [ ] ICE candidates are exchanged
- [ ] Video stream displays
- [ ] Audio works
- [ ] Can toggle video on/off
- [ ] Can toggle audio on/off
- [ ] Can end call
- [ ] Call duration is recorded
- [ ] Call history displays

## Troubleshooting

### Issue: WebSocket won't connect

**Solution**: Check CORS configuration in main.ts
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

### Issue: Video not displaying

**Solution**: Ensure HTTPS (WebRTC requires secure context)
```bash
# For development, use ngrok
ngrok http 3000
```

### Issue: Can't connect to peer

**Solution**: Check STUN/TURN configuration
```typescript
// Add more STUN servers or configure TURN
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]
```

### Issue: Database error

**Solution**: Run migrations
```bash
npm run typeorm migration:run
```

## Next Steps

1. ✅ Basic setup complete
2. 📖 Read [README.md](./README.md) for full documentation
3. 🏗️ Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
4. 🚀 Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for production deployment
5. 🔒 Configure TURN servers for production
6. 📊 Set up monitoring and logging
7. 🧪 Write tests
8. 🌐 Deploy to production

## Resources

- **Documentation**: See README.md in this directory
- **Architecture**: See ARCHITECTURE.md for system design
- **Production Guide**: See IMPLEMENTATION_GUIDE.md
- **Configuration**: See webrtc.config.example.ts

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full documentation
3. Check WebRTC browser compatibility
4. Verify network/firewall settings

## Quick Reference

### REST API Endpoints
```
POST   /webrtc/calls              - Create call
GET    /webrtc/calls              - Get call history
GET    /webrtc/calls/:id          - Get call details
POST   /webrtc/calls/:id/answer   - Answer call
POST   /webrtc/calls/:id/end      - End call
POST   /webrtc/calls/:id/record   - Start recording
GET    /webrtc/stats              - Get statistics
```

### WebSocket Events
```
Client → Server:
- join-call
- leave-call
- offer
- answer
- ice-candidate
- update-media
- connection-quality

Server → Client:
- incoming-call
- participant-joined
- participant-left
- offer
- answer
- ice-candidate
- call-ended
- recording-started
```

---

**Ready to go?** Start with Step 1 above! 🚀
