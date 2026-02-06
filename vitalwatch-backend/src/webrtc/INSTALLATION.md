# WebRTC Installation Instructions

## Quick Installation

Run these commands to complete the installation:

### 1. Install NPM Dependencies

```bash
cd /home/user/RMP/vitalwatch-backend

# Install WebRTC dependencies
npm install @nestjs/websockets@^10.3.0 @nestjs/platform-socket.io@^10.3.0 socket.io@^4.6.0 uuid@^9.0.0

# Install TypeScript types
npm install --save-dev @types/socket.io@^3.0.0

# Optional: Install storage SDKs (if using recording features)
npm install @aws-sdk/client-s3@^3.490.0 @aws-sdk/s3-request-presigner@^3.490.0
```

### 2. Run Database Migrations

```bash
# Generate migration for WebRTC tables
npm run typeorm migration:generate -- -n CreateWebRTCTables

# Run the migration
npm run typeorm migration:run
```

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# WebRTC STUN/TURN Configuration
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
WEBRTC_TURN_SERVERS=
WEBRTC_TURN_USERNAME=
WEBRTC_TURN_PASSWORD=

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3001

# Recording Storage (if using recording features)
STORAGE_PROVIDER=aws-s3
AWS_S3_BUCKET=vytalwatch-call-recordings
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Recording Settings
RECORDING_RETENTION_DAYS=365
RECORDING_ENABLE_TRANSCRIPTION=false
```

### 4. Update Configuration File

Edit `src/config/configuration.ts` and add WebRTC configuration:

```typescript
export default () => ({
  // ... existing configuration

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
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION || 'us-east-1',
  },

  recording: {
    retentionDays: parseInt(process.env.RECORDING_RETENTION_DAYS) || 365,
    enableTranscription: process.env.RECORDING_ENABLE_TRANSCRIPTION === 'true',
  },
});
```

### 5. Start the Server

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 6. Verify Installation

Test the API endpoint:

```bash
curl http://localhost:3000/webrtc/stats
```

You should see a response with call statistics (empty if no calls yet).

---

## Detailed Installation Steps

### Prerequisites Verification

Check that you have the required tools installed:

```bash
# Check Node.js version (requires 16+)
node --version

# Check npm version
npm --version

# Check PostgreSQL is running
psql --version

# Verify database connection
psql -h localhost -U postgres -d vytalwatch -c "SELECT version();"
```

### Database Setup

#### Option 1: Automatic Migration (Recommended)

```bash
# Generate migration automatically from entities
npm run typeorm migration:generate -- -n CreateWebRTCTables

# Review the generated migration file in src/migrations/
# Then run it
npm run typeorm migration:run
```

#### Option 2: Manual SQL (if needed)

If automatic migration doesn't work, you can create tables manually:

```sql
-- Connect to your database
psql -h localhost -U postgres -d vytalwatch

-- Create calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  organization_id UUID,
  type VARCHAR(20) NOT NULL DEFAULT 'video',
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  room_id VARCHAR(255) NOT NULL UNIQUE,
  session_id VARCHAR(255),
  initiated_by UUID NOT NULL,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration INTEGER,
  actual_duration INTEGER,
  appointment_id UUID,
  clinical_note_id UUID,
  quality_metrics JSONB,
  stun_servers TEXT[],
  turn_servers TEXT[],
  end_reason TEXT,
  ended_by UUID,
  failure_reason TEXT,
  error_details JSONB,
  recording_enabled BOOLEAN DEFAULT FALSE,
  recording_consent_obtained BOOLEAN DEFAULT FALSE,
  recording_consented_at TIMESTAMP,
  recording_consented_by TEXT[],
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_hipaa_compliant BOOLEAN DEFAULT FALSE,
  encryption_key TEXT,
  fellback_to_audio BOOLEAN DEFAULT FALSE,
  fallback_reason TEXT,
  fallback_at TIMESTAMP,
  reconnection_attempts INTEGER DEFAULT 0,
  last_reconnection_at TIMESTAMP,
  metadata JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create call_participants table
CREATE TABLE call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  participation_duration INTEGER,
  socket_id VARCHAR(255),
  peer_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  video_enabled BOOLEAN DEFAULT FALSE,
  audio_enabled BOOLEAN DEFAULT FALSE,
  screen_share_enabled BOOLEAN DEFAULT FALSE,
  connection_quality JSONB,
  disconnection_count INTEGER DEFAULT 0,
  last_disconnected_at TIMESTAMP,
  disconnection_reason TEXT,
  consented_to_recording BOOLEAN DEFAULT FALSE,
  consented_to_recording_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create call_recordings table
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  file_name VARCHAR(255),
  file_path TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  duration INTEGER,
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  started_by UUID,
  stopped_by UUID,
  consent_obtained BOOLEAN DEFAULT FALSE,
  consented_participants TEXT[],
  consent_obtained_at TIMESTAMP,
  consent_details JSONB,
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_hipaa_compliant BOOLEAN DEFAULT FALSE,
  encryption_algorithm VARCHAR(50),
  encryption_key_id TEXT,
  encrypted_at TIMESTAMP,
  storage_provider VARCHAR(50),
  storage_bucket VARCHAR(255),
  storage_key TEXT,
  storage_region VARCHAR(50),
  retention_period INTEGER,
  expires_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP,
  processing_progress INTEGER DEFAULT 0,
  processing_error TEXT,
  processed_at TIMESTAMP,
  is_transcribed BOOLEAN DEFAULT FALSE,
  transcription_text TEXT,
  transcription_url TEXT,
  transcription_data JSONB,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  last_viewed_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_calls_patient_created ON calls(patient_id, created_at);
CREATE INDEX idx_calls_provider_created ON calls(provider_id, created_at);
CREATE INDEX idx_calls_status_scheduled ON calls(status, scheduled_at);
CREATE INDEX idx_calls_appointment ON calls(appointment_id);

CREATE INDEX idx_participants_call_user ON call_participants(call_id, user_id);
CREATE INDEX idx_participants_call_status ON call_participants(call_id, status);

CREATE INDEX idx_recordings_call_status ON call_recordings(call_id, status);
CREATE INDEX idx_recordings_created ON call_recordings(created_at);
```

### Verify Database Tables

```bash
# Check that tables were created
psql -h localhost -U postgres -d vytalwatch -c "\dt"

# Should see:
# - calls
# - call_participants
# - call_recordings
```

### CORS Configuration

Update `src/main.ts` to enable CORS for WebSockets:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for both HTTP and WebSocket
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

---

## Testing Installation

### 1. Test REST API

```bash
# Create a test call
curl -X POST http://localhost:3000/webrtc/calls \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "00000000-0000-0000-0000-000000000001",
    "providerId": "00000000-0000-0000-0000-000000000002",
    "type": "video"
  }'

# Get call statistics
curl http://localhost:3000/webrtc/stats
```

### 2. Test WebSocket Connection

Create a test file `test-websocket.js`:

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/webrtc', {
  query: { userId: 'test-user-123' }
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('Socket ID:', socket.id);
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});
```

Run it:
```bash
node test-websocket.js
```

### 3. Check Server Logs

```bash
# In development mode, you should see:
# - "WebRTCModule dependencies initialized"
# - "WebRTC Gateway listening on namespace: /webrtc"
# - WebSocket connection logs when clients connect
```

---

## Troubleshooting

### Issue: "Cannot find module '@nestjs/websockets'"

**Solution**: Install the dependencies
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Issue: "relation 'calls' does not exist"

**Solution**: Run the database migrations
```bash
npm run typeorm migration:run
```

### Issue: WebSocket connection fails with CORS error

**Solution**: Update CORS configuration in `src/main.ts`
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
});
```

### Issue: "Cannot find module 'uuid'"

**Solution**: Install uuid package
```bash
npm install uuid
```

### Issue: TypeScript compilation errors

**Solution**: Rebuild the project
```bash
npm run build
```

---

## Post-Installation

### Next Steps

1. ✅ Installation complete
2. 📖 Read [QUICK_START.md](./QUICK_START.md) for basic usage
3. 📚 Read [README.md](./README.md) for full documentation
4. 🏗️ Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for production setup
5. 🔧 Configure TURN servers for production use
6. 🧪 Write integration tests
7. 🚀 Deploy to production

### Optional Components

#### 1. Install Recording Dependencies (Optional)

If you plan to use call recording features:

```bash
# AWS S3
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Azure Blob Storage (alternative)
npm install @azure/storage-blob

# Google Cloud Storage (alternative)
npm install @google-cloud/storage
```

#### 2. Install Monitoring Tools (Optional)

```bash
npm install @nestjs/terminus @nestjs/axios
```

#### 3. Setup TURN Server (Recommended for Production)

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md#turn-server-setup) for detailed instructions.

---

## Verification Checklist

- [ ] All npm packages installed
- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] Server starts without errors
- [ ] REST API responds to requests
- [ ] WebSocket connections work
- [ ] Database tables created
- [ ] CORS configured properly
- [ ] Documentation reviewed

---

## Support

If you encounter any issues during installation:

1. Check the logs: `npm run start:dev`
2. Verify database connection
3. Check environment variables
4. Review [TROUBLESHOOTING](./IMPLEMENTATION_GUIDE.md#troubleshooting) section
5. Ensure all prerequisites are met

---

## Summary

After completing these steps, your WebRTC system will be:

✅ **Installed** - All dependencies and database tables ready
✅ **Configured** - Environment variables set
✅ **Running** - Server accepting REST and WebSocket connections
✅ **Tested** - Basic functionality verified
✅ **Ready** - Ready for frontend integration

**Estimated Installation Time**: 10-15 minutes

**Next**: Follow [QUICK_START.md](./QUICK_START.md) to integrate with your frontend!
