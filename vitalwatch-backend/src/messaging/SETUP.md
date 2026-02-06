# Messaging System Setup Guide

Complete step-by-step setup instructions for the VytalWatch Messaging System.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for WebSocket scaling)
- NestJS CLI (`npm install -g @nestjs/cli`)

## Installation Steps

### 1. Install NPM Dependencies

```bash
cd /home/user/RMP/vitalwatch-backend

# Install WebSocket dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Install AWS SDK (if using S3 for file storage)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Install Azure SDK (if using Azure Blob Storage)
npm install @azure/storage-blob

# Install Google Cloud SDK (if using GCS)
npm install @google-cloud/storage

# Install virus scanning (optional)
npm install clamscan

# Install Redis adapter for WebSocket scaling (optional)
npm install @socket.io/redis-adapter ioredis
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp src/messaging/.env.example .env
```

Edit `.env` and add the following variables:

```env
# Required: Generate encryption key
MESSAGING_ENCRYPTION_KEY=<generate-with-command-below>

# Generate encryption key with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Frontend URL for WebSocket CORS
FRONTEND_URL=http://localhost:3000

# Database connection (should already exist)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=vytalwatch

# Optional: Redis for WebSocket scaling
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: File storage (S3 example)
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=vytalwatch-messages
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional: Virus scanning
ENABLE_VIRUS_SCAN=true
VIRUS_SCANNER_TYPE=mock
```

### 3. Generate Encryption Key

**CRITICAL: Generate a secure encryption key for production!**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and add it to your `.env` file as `MESSAGING_ENCRYPTION_KEY`.

### 4. Update Database Schema

Create migration for messaging tables:

```bash
# Generate migration
npm run migration:generate -- -n CreateMessagingTables

# Review the generated migration file
# It should create the 'conversations' and 'messages' tables

# Run migration
npm run migration:run
```

Or manually create tables using this SQL:

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES users(id),
  last_message_id UUID,
  last_message_preview TEXT,
  last_message_at TIMESTAMP,
  patient_unread_count INTEGER DEFAULT 0,
  provider_unread_count INTEGER DEFAULT 0,
  patient_archived BOOLEAN DEFAULT FALSE,
  provider_archived BOOLEAN DEFAULT FALSE,
  patient_muted BOOLEAN DEFAULT FALSE,
  provider_muted BOOLEAN DEFAULT FALSE,
  encryption_key_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT unique_conversation UNIQUE(patient_id, provider_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) DEFAULT 'text',
  status VARCHAR(50) DEFAULT 'sent',
  encrypted_content TEXT NOT NULL,
  iv VARCHAR(255),
  auth_tag VARCHAR(255),
  plain_content TEXT,
  attachments JSONB,
  reply_to_message_id UUID REFERENCES messages(id),
  metadata JSONB,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_conversations_patient_provider ON conversations(patient_id, provider_id);
CREATE INDEX idx_conversations_created ON conversations(created_at);
CREATE INDEX idx_conversations_updated ON conversations(updated_at);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at);
CREATE INDEX idx_messages_status_created ON messages(status, created_at);
```

### 5. Update AppModule

Edit `src/app.module.ts` and add the MessagingModule:

```typescript
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    // ... existing modules
    MessagingModule,
  ],
})
export class AppModule {}
```

### 6. Configure WebSocket CORS

Edit `src/main.ts` to enable WebSocket CORS:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for REST API
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // WebSocket adapter configuration (if using Redis for scaling)
  // import { IoAdapter } from '@nestjs/platform-socket.io';
  // import { createAdapter } from '@socket.io/redis-adapter';
  // import { createClient } from 'redis';
  //
  // const redisAdapter = await createAdapter(
  //   createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` }),
  //   createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` })
  // );
  // app.useWebSocketAdapter(new IoAdapter(app, redisAdapter));

  await app.listen(3000);
}
bootstrap();
```

### 7. Update Authentication Guards

The messaging system uses JWT authentication. Make sure your JWT guard is properly configured:

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Update `messaging.controller.ts` to use the correct guard:

```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messaging')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class MessagingController {
  // ... controller methods
}
```

### 8. Configure File Upload (Optional)

If you want to support file uploads, configure multer middleware:

```bash
npm install @nestjs/platform-express multer
npm install --save-dev @types/multer
```

Create file upload controller:

```typescript
// src/messaging/messaging-upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileStorageUtil } from './utils/file-storage.util';
import { VirusScannerUtil } from './utils/virus-scanner.util';

@Controller('messaging/upload')
@UseGuards(JwtAuthGuard)
export class MessagingUploadController {
  constructor(
    private readonly fileStorage: FileStorageUtil,
    private readonly virusScanner: VirusScannerUtil,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    // Scan file for viruses
    const scanResult = await this.virusScanner.scanFile(
      file.buffer,
      file.originalname,
    );

    if (!scanResult.clean) {
      throw new BadRequestException('File contains malware');
    }

    // Upload to storage
    const uploaded = await this.fileStorage.uploadFile(
      file.buffer,
      file.originalname,
      'temp', // Will be moved when message is sent
    );

    return uploaded;
  }
}
```

### 9. Set Up Audit Logging

Ensure the AuditLog entity has the necessary actions for messaging:

```typescript
// src/audit/entities/audit-log.entity.ts
export enum AuditAction {
  // ... existing actions
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_READ = 'MESSAGE_READ',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  FILE_UPLOADED = 'FILE_UPLOADED',
}
```

### 10. Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### 11. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Verification

### Test REST API

```bash
# Create conversation
curl -X POST http://localhost:3000/messaging/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "providerId": "provider-uuid"
  }'

# Send message
curl -X POST http://localhost:3000/messaging/conversations/{conversation-id}/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, this is a test message",
    "type": "text"
  }'

# Get messages
curl -X GET http://localhost:3000/messaging/conversations/{conversation-id}/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test WebSocket

```bash
npm install -g wscat

# Connect to WebSocket (replace {token} and {userId})
wscat -c "ws://localhost:3000/messaging?userId={userId}" \
  -H "Authorization: Bearer {token}"

# After connection, send events:
{"event": "conversation:join", "data": {"conversationId": "uuid"}}
{"event": "typing", "data": {"conversationId": "uuid", "isTyping": true}}
```

### Test Frontend Integration

```javascript
// Example React component
import io from 'socket.io-client';

function MessagingTest() {
  useEffect(() => {
    const socket = io('http://localhost:3000/messaging', {
      auth: { token: getAuthToken() }
    });

    socket.on('connect', () => console.log('Connected'));
    socket.on('message:new', (data) => console.log('New message:', data));

    return () => socket.close();
  }, []);
}
```

## Production Deployment Checklist

- [ ] Set strong `MESSAGING_ENCRYPTION_KEY` (never commit to git!)
- [ ] Configure production database with SSL
- [ ] Set up Redis for WebSocket scaling
- [ ] Configure S3/Azure/GCS for file storage
- [ ] Enable virus scanning (ClamAV or cloud service)
- [ ] Set up SSL/TLS certificates (Let's Encrypt)
- [ ] Configure rate limiting for production load
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy for messages
- [ ] Enable audit logging
- [ ] Set up log aggregation (ELK, Datadog, etc.)
- [ ] Configure CDN for file delivery
- [ ] Test disaster recovery procedures
- [ ] Review HIPAA compliance checklist
- [ ] Conduct security audit
- [ ] Set up automated backups

## Troubleshooting

### WebSocket connection fails

**Problem**: Cannot connect to WebSocket server

**Solutions**:
1. Check CORS configuration in `messaging.gateway.ts`
2. Verify `FRONTEND_URL` environment variable
3. Check firewall/security groups allow WebSocket connections
4. Test with `wscat` to isolate client issues

### Messages not encrypting

**Problem**: Messages stored in plain text

**Solutions**:
1. Verify `MESSAGING_ENCRYPTION_KEY` is set
2. Check encryption key is 32 bytes (256 bits)
3. Review logs for encryption errors
4. Test encryption utility directly

### Database migration fails

**Problem**: Migration won't run

**Solutions**:
1. Check database connection
2. Verify user has CREATE TABLE permissions
3. Check if tables already exist
4. Review migration SQL for syntax errors

### File uploads fail

**Problem**: Cannot upload attachments

**Solutions**:
1. Check S3/Azure credentials
2. Verify bucket exists and has write permissions
3. Check file size limits
4. Review virus scanner configuration

## Support

For additional help:
- Review the [README.md](./README.md) for API documentation
- Check NestJS documentation: https://docs.nestjs.com
- Review TypeORM documentation: https://typeorm.io

## Security Notes

**IMPORTANT**:
- Never commit `.env` file to version control
- Rotate encryption keys regularly
- Use AWS KMS or Azure Key Vault for key management in production
- Enable audit logging for all message access
- Review and update dependencies regularly
- Conduct regular security audits
- Follow HIPAA compliance guidelines
