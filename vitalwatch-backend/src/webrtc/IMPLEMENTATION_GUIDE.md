# WebRTC Implementation Guide

This guide will help you implement and deploy the WebRTC video call system in your VytalWatch RPM platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Database Setup](#database-setup)
4. [TURN Server Setup](#turn-server-setup)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js >= 16.x
- PostgreSQL >= 13.x
- Redis (for session management)
- AWS S3 / Azure Blob / GCP Storage (for recordings)
- SSL certificates (required for WebRTC)

### Development Tools
- npm or yarn
- TypeScript >= 4.x
- NestJS CLI

## Installation Steps

### 1. Install Dependencies

```bash
# Navigate to backend directory
cd vitalwatch-backend

# Install WebRTC dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io uuid

# Install additional dependencies for recording
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Install TypeScript types
npm install --save-dev @types/socket.io
```

### 2. Configure Environment Variables

Create or update your `.env` file:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=vytalwatch
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password

# WebRTC Configuration
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
WEBRTC_TURN_SERVERS=turn:your-turn-server.com:3478
WEBRTC_TURN_USERNAME=your-turn-username
WEBRTC_TURN_PASSWORD=your-turn-password

# Storage Configuration (AWS S3 example)
STORAGE_PROVIDER=aws-s3
AWS_S3_BUCKET=vytalwatch-call-recordings
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Recording Configuration
RECORDING_RETENTION_DAYS=365
RECORDING_MAX_FILE_SIZE=5368709120
RECORDING_ENABLE_TRANSCRIPTION=false

# Frontend URL (for CORS)
FRONTEND_URL=https://app.vytalwatch.com

# JWT Secret (for WebSocket authentication)
JWT_SECRET=your-jwt-secret

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 3. Update Configuration File

Edit `src/config/configuration.ts` and add the WebRTC configuration from `webrtc.config.example.ts`.

### 4. Enable CORS for WebSockets

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for HTTP and WebSocket
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

## Database Setup

### 1. Generate Migration

```bash
npm run typeorm migration:generate -- -n CreateWebRTCTables
```

### 2. Review Migration

The migration file will be created in `src/migrations/`. Review it to ensure all tables are created correctly:
- `calls` - Main call records
- `call_participants` - Participant tracking
- `call_recordings` - Recording metadata

### 3. Run Migration

```bash
npm run typeorm migration:run
```

### 4. Verify Tables

Connect to PostgreSQL and verify tables were created:

```sql
\dt

-- Should see:
-- calls
-- call_participants
-- call_recordings
```

### 5. Create Indexes

Additional indexes for performance (if not in migration):

```sql
-- Call indexes
CREATE INDEX idx_calls_patient_created ON calls(patient_id, created_at);
CREATE INDEX idx_calls_provider_created ON calls(provider_id, created_at);
CREATE INDEX idx_calls_status_scheduled ON calls(status, scheduled_at);
CREATE INDEX idx_calls_appointment ON calls(appointment_id);

-- Participant indexes
CREATE INDEX idx_participants_call_user ON call_participants(call_id, user_id);
CREATE INDEX idx_participants_call_status ON call_participants(call_id, status);

-- Recording indexes
CREATE INDEX idx_recordings_call_status ON call_recordings(call_id, status);
CREATE INDEX idx_recordings_created ON call_recordings(created_at);
```

## TURN Server Setup

For production deployments, you MUST configure your own TURN servers. Here's how to set up coturn (open source TURN server):

### 1. Install coturn

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install coturn

# Enable coturn
sudo systemctl enable coturn
```

### 2. Configure coturn

Edit `/etc/turnserver.conf`:

```conf
# Listener port
listening-port=3478
tls-listening-port=5349

# External IP (your server's public IP)
external-ip=YOUR_PUBLIC_IP

# Relay IP (can be same as external IP)
relay-ip=YOUR_PUBLIC_IP

# Authentication
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY

# Realm
realm=vytalwatch.com

# SSL certificates (required for TLS)
cert=/etc/letsencrypt/live/turn.vytalwatch.com/cert.pem
pkey=/etc/letsencrypt/live/turn.vytalwatch.com/privkey.pem

# Logging
verbose
log-file=/var/log/turnserver.log

# Performance
max-bps=1000000
bps-capacity=0

# Security
no-multicast-peers
no-cli
no-loopback-peers
no-rfc5780
no-stun-backward-compatibility
```

### 3. Start coturn

```bash
sudo systemctl start coturn
sudo systemctl status coturn
```

### 4. Configure Firewall

```bash
# Allow TURN ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Allow relay port range
sudo ufw allow 49152:65535/udp
```

### 5. Update Environment Variables

```env
WEBRTC_TURN_SERVERS=turn:turn.vytalwatch.com:3478,turns:turn.vytalwatch.com:5349
WEBRTC_TURN_USERNAME=vytalwatch
WEBRTC_TURN_PASSWORD=YOUR_SECRET_KEY
```

## Testing

### 1. Unit Tests

Create test file `src/webrtc/webrtc.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { WebRTCService } from './webrtc.service';

describe('WebRTCService', () => {
  let service: WebRTCService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebRTCService],
    }).compile();

    service = module.get<WebRTCService>(WebRTCService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests
});
```

Run tests:
```bash
npm test
```

### 2. Integration Testing

Test the complete flow:

```bash
# Start the server
npm run start:dev

# In another terminal, test REST API
curl -X POST http://localhost:3000/webrtc/calls \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "providerId": "provider-uuid",
    "type": "video"
  }'

# Test WebSocket connection
# Use a WebSocket client or browser console
```

### 3. Load Testing

Use tools like Artillery or k6 for load testing:

```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Create Call"
    flow:
      - post:
          url: "/webrtc/calls"
          json:
            patientId: "test-patient"
            providerId: "test-provider"
            type: "video"
```

Run:
```bash
artillery run artillery.yml
```

## Production Deployment

### 1. Build Application

```bash
npm run build
```

### 2. Configure PM2 (Process Manager)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'vytalwatch-api',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Configure Nginx

Create `/etc/nginx/sites-available/vytalwatch`:

```nginx
upstream backend {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name api.vytalwatch.com;

    ssl_certificate /etc/letsencrypt/live/api.vytalwatch.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vytalwatch.com/privkey.pem;

    # REST API
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /webrtc {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/vytalwatch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificates

Use Let's Encrypt for free SSL certificates:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.vytalwatch.com
```

### 5. Database Optimization

```sql
-- Vacuum and analyze
VACUUM ANALYZE calls;
VACUUM ANALYZE call_participants;
VACUUM ANALYZE call_recordings;

-- Update statistics
ANALYZE;
```

## Monitoring

### 1. Application Monitoring

Install monitoring tools:

```bash
npm install @nestjs/terminus @nestjs/axios
```

Create health check endpoint in `src/health/health.controller.ts`.

### 2. Logs

Configure structured logging:

```bash
npm install winston nest-winston
```

### 3. Metrics

Track important metrics:
- Active calls count
- Call duration averages
- Connection quality metrics
- Recording storage usage
- TURN server usage

### 4. Alerts

Set up alerts for:
- High call failure rate
- Poor connection quality
- Storage capacity warnings
- TURN server failures

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Fails

**Symptoms**: Clients can't establish WebSocket connection

**Solutions**:
- Verify CORS configuration
- Check firewall rules
- Ensure SSL certificates are valid
- Check Nginx WebSocket proxy configuration

#### 2. Calls Not Connecting

**Symptoms**: Call initiates but participants can't see/hear each other

**Solutions**:
- Verify STUN/TURN server configuration
- Check NAT/firewall settings
- Test ICE candidate gathering
- Enable TURN server logging

#### 3. Poor Call Quality

**Symptoms**: Choppy audio/video, delays

**Solutions**:
- Check bandwidth availability
- Monitor packet loss
- Verify TURN server capacity
- Consider video quality fallback

#### 4. Recording Failures

**Symptoms**: Recording start fails or files not saved

**Solutions**:
- Verify storage configuration
- Check storage credentials
- Monitor storage capacity
- Check recording consent

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

View logs:
```bash
pm2 logs vytalwatch-api
```

### Support

For additional support:
- Check logs: `/var/log/vytalwatch/`
- Monitor system resources: `htop`, `iotop`
- Test connectivity: `telnet turn.vytalwatch.com 3478`
- Review Nginx logs: `/var/log/nginx/error.log`

## Security Checklist

- [ ] SSL/TLS enabled for all connections
- [ ] JWT authentication for WebSocket connections
- [ ] TURN server authentication configured
- [ ] Recording encryption enabled
- [ ] Access control for recordings implemented
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] Firewall rules configured
- [ ] Regular security updates
- [ ] HIPAA compliance verified

## Performance Tuning

### Database
- Enable connection pooling
- Configure appropriate indexes
- Regular VACUUM operations
- Monitor slow queries

### Application
- Enable clustering (PM2)
- Configure worker threads
- Optimize WebSocket handlers
- Implement caching

### Network
- Use CDN for static assets
- Configure HTTP/2
- Enable gzip compression
- Optimize TURN relay usage

## Next Steps

1. Complete frontend integration
2. Implement advanced features (screen sharing, recording transcription)
3. Set up monitoring and alerting
4. Perform security audit
5. Load testing and optimization
6. User acceptance testing
7. Production deployment
8. Documentation and training

## Resources

- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [coturn Documentation](https://github.com/coturn/coturn/wiki)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Socket.IO Documentation](https://socket.io/docs/)
