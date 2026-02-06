# VytalWatch RPM - Messaging System

A complete, secure, HIPAA-compliant messaging/chat system for patient-provider communication in VytalWatch Remote Patient Monitoring platform.

## Features

- ✅ **End-to-End Encryption**: AES-256-GCM encryption for all messages
- ✅ **Real-time Communication**: WebSocket support for instant message delivery
- ✅ **File Attachments**: Support for images, documents with virus scanning
- ✅ **Read Receipts**: Delivered and read status tracking
- ✅ **Typing Indicators**: Real-time typing status
- ✅ **Message Search**: Full-text search across conversations
- ✅ **Unread Counts**: Track unread messages per conversation
- ✅ **Soft Delete**: Message history preservation
- ✅ **Audit Logging**: Complete audit trail for HIPAA compliance
- ✅ **Rate Limiting**: Anti-spam protection
- ✅ **HIPAA Compliance**: PHI protection and access controls

## Architecture

```
messaging/
├── entities/
│   ├── conversation.entity.ts    # Patient-provider conversations
│   └── message.entity.ts         # Individual messages
├── dto/
│   ├── create-conversation.dto.ts
│   ├── send-message.dto.ts
│   └── query-messages.dto.ts
├── utils/
│   └── encryption.util.ts        # AES-256-GCM encryption utilities
├── messaging.controller.ts       # REST API endpoints
├── messaging.service.ts          # Business logic
├── messaging.gateway.ts          # WebSocket gateway
└── messaging.module.ts           # Module configuration
```

## Installation

### 1. Install Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Messaging Encryption (REQUIRED for production)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
MESSAGING_ENCRYPTION_KEY=your-secure-encryption-key-here

# Frontend URL for CORS (WebSocket)
FRONTEND_URL=http://localhost:3000
```

### 3. Database Migration

Run database migrations to create the necessary tables:

```bash
npm run migration:generate -- -n CreateMessagingTables
npm run migration:run
```

### 4. Add to AppModule

Update `/src/app.module.ts`:

```typescript
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    // ... other modules
    MessagingModule,
  ],
})
export class AppModule {}
```

## API Documentation

### REST Endpoints

#### Create Conversation
```http
POST /messaging/conversations
Authorization: Bearer {token}
Content-Type: application/json

{
  "patientId": "uuid",
  "providerId": "uuid",
  "initialMessage": "Hello, I need help with...",
  "subject": "Blood pressure concerns",
  "priority": "normal"
}
```

#### Get User Conversations
```http
GET /messaging/conversations?archived=false
Authorization: Bearer {token}
```

#### Get Conversation Details
```http
GET /messaging/conversations/{id}
Authorization: Bearer {token}
```

#### Send Message
```http
POST /messaging/conversations/{id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Your message here",
  "type": "text",
  "attachments": [
    {
      "fileName": "report.pdf",
      "fileSize": 102400,
      "mimeType": "application/pdf",
      "url": "s3://bucket/file.pdf"
    }
  ],
  "replyToMessageId": "uuid",
  "priority": "normal"
}
```

#### Get Messages
```http
GET /messaging/conversations/{id}/messages?page=1&limit=50
Authorization: Bearer {token}
```

#### Mark Message as Read
```http
PATCH /messaging/messages/{id}/read
Authorization: Bearer {token}
```

#### Get Unread Count
```http
GET /messaging/conversations/unread-count
Authorization: Bearer {token}
```

#### Search Messages
```http
GET /messaging/messages/search?q=blood%20pressure&limit=50
Authorization: Bearer {token}
```

#### Delete Message
```http
DELETE /messaging/messages/{id}
Authorization: Bearer {token}
```

### WebSocket Events

Connect to WebSocket server:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/messaging', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Client → Server Events

**Join Conversation**
```javascript
socket.emit('conversation:join', {
  conversationId: 'uuid'
});
```

**Leave Conversation**
```javascript
socket.emit('conversation:leave', {
  conversationId: 'uuid'
});
```

**Typing Indicator**
```javascript
socket.emit('typing', {
  conversationId: 'uuid',
  isTyping: true
});
```

**Message Sent**
```javascript
socket.emit('message:sent', {
  conversationId: 'uuid',
  messageId: 'uuid'
});
```

**Message Read**
```javascript
socket.emit('message:read', {
  messageId: 'uuid'
});
```

#### Server → Client Events

**New Message**
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
  // { conversationId, messageId }
});
```

**Message Delivered**
```javascript
socket.on('message:delivered', (data) => {
  console.log('Message delivered:', data);
  // { messageId, deliveredAt }
});
```

**Message Read**
```javascript
socket.on('message:read', (data) => {
  console.log('Message read:', data);
  // { messageId, readAt }
});
```

**Typing Indicator**
```javascript
socket.on('typing', (data) => {
  console.log('User typing:', data);
  // { conversationId, userId, isTyping }
});
```

**User Status**
```javascript
socket.on('user:status', (data) => {
  console.log('User status:', data);
  // { userId, status: 'online' | 'offline', timestamp }
});
```

## Security Features

### 1. End-to-End Encryption

All messages are encrypted using AES-256-GCM:

```typescript
// Encryption happens automatically in the service
const encrypted = EncryptionUtil.encrypt(message, conversationKey);

// Messages are decrypted when retrieved
const decrypted = EncryptionUtil.decrypt(encryptedData, conversationKey);
```

### 2. Per-Conversation Encryption Keys

Each conversation has a unique encryption key derived from the master key:

```typescript
const conversationKey = EncryptionUtil.deriveKey(
  masterKey,
  conversationId
);
```

### 3. File Encryption

File attachments are also encrypted:

```typescript
const encryptedFile = EncryptionUtil.encryptFile(
  fileBuffer,
  conversationKey
);
```

### 4. Access Controls

- Users can only access conversations they're part of
- Users can only delete their own messages
- All actions are logged in the audit trail

### 5. Rate Limiting

- 60 messages per minute per user
- Prevents spam and abuse
- Configurable in `messaging.module.ts`

## HIPAA Compliance

### PHI Protection

1. **Encryption at Rest**: All messages encrypted in database
2. **Encryption in Transit**: HTTPS/WSS for all communications
3. **Access Logging**: All message access logged in audit trail
4. **Soft Delete**: Messages never permanently deleted for compliance
5. **File Security**: Virus scanning for all attachments

### Audit Trail

Every action is logged:

```typescript
await createAuditLog(
  AuditAction.MESSAGE_SENT,
  userId,
  'message',
  messageId,
  { conversationId, type, hasAttachments },
  ipAddress,
  userAgent
);
```

### Data Retention

Messages are soft-deleted and retained for compliance:

```typescript
// Soft delete preserves message for audit
message.deletedAt = new Date();
message.metadata.deleted = true;
message.metadata.deletedBy = userId;
```

## Usage Examples

### Frontend Integration (React)

```typescript
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

function MessagingApp() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    // Initialize WebSocket
    const ws = io('http://localhost:3000/messaging', {
      auth: { token: getAuthToken() }
    });

    ws.on('message:new', handleNewMessage);
    ws.on('typing', handleTyping);

    setSocket(ws);

    return () => ws.close();
  }, []);

  const sendMessage = async (content) => {
    // Send via REST API
    const response = await axios.post(
      `/messaging/conversations/${conversationId}/messages`,
      { content, type: 'text' },
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );

    // Notify via WebSocket
    socket.emit('message:sent', {
      conversationId,
      messageId: response.data.id
    });
  };

  const handleTyping = (isTyping) => {
    socket.emit('typing', {
      conversationId,
      isTyping
    });
  };

  // ... render UI
}
```

### Backend Integration

```typescript
import { MessagingService } from './messaging/messaging.service';
import { MessagingGateway } from './messaging/messaging.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private messagingService: MessagingService,
    private messagingGateway: MessagingGateway,
  ) {}

  async sendSystemMessage(conversationId: string, content: string) {
    const message = await this.messagingService.sendMessage(
      conversationId,
      {
        content,
        type: MessageType.SYSTEM,
      },
      'system',
    );

    // Notify users via WebSocket
    const conversation = await this.messagingService.getConversation(
      conversationId,
      'system',
    );

    this.messagingGateway.emitNewMessage(
      conversationId,
      message.id,
      conversation.patientId,
    );

    this.messagingGateway.emitNewMessage(
      conversationId,
      message.id,
      conversation.providerId,
    );
  }
}
```

## File Upload Flow

1. **Client uploads file to storage** (S3, Azure Blob, etc.)
2. **Client sends message with attachment metadata**
3. **Server validates file type and size**
4. **Background job scans file for viruses**
5. **File URL is encrypted before storage**
6. **Recipient decrypts and downloads file**

```typescript
// Example file upload handler
async uploadAttachment(file: Express.Multer.File) {
  // 1. Validate file
  if (file.size > 50 * 1024 * 1024) {
    throw new BadRequestException('File too large');
  }

  // 2. Upload to S3/storage
  const url = await this.storageService.upload(file);

  // 3. Queue virus scan
  await this.queueService.add('virus-scan', { url, fileId });

  // 4. Return metadata for message
  return {
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    url,
  };
}
```

## Testing

### Unit Tests

```typescript
describe('MessagingService', () => {
  it('should create conversation', async () => {
    const conversation = await service.createConversation({
      patientId: 'patient-id',
      providerId: 'provider-id',
    }, 'provider-id');

    expect(conversation).toBeDefined();
    expect(conversation.patientId).toBe('patient-id');
  });

  it('should encrypt and decrypt messages', () => {
    const content = 'Test message';
    const key = EncryptionUtil.generateKey();

    const encrypted = EncryptionUtil.encrypt(content, key);
    const decrypted = EncryptionUtil.decrypt(encrypted, key);

    expect(decrypted).toBe(content);
  });
});
```

### Integration Tests

```typescript
describe('MessagingController (e2e)', () => {
  it('POST /messaging/conversations', () => {
    return request(app.getHttpServer())
      .post('/messaging/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'patient-id',
        providerId: 'provider-id',
      })
      .expect(201);
  });
});
```

## Performance Optimization

### Database Indexes

- Composite indexes on `(conversationId, createdAt)`
- Index on `(userId, status, createdAt)` for unread queries
- Full-text search index for message content (after decryption)

### Caching

Consider adding Redis cache for:
- Active conversations
- Unread counts
- User online status

```typescript
// Example caching
@Injectable()
export class MessagingService {
  async getUnreadCount(userId: string): Promise<number> {
    const cached = await this.redis.get(`unread:${userId}`);
    if (cached) return parseInt(cached);

    const count = await this.calculateUnreadCount(userId);
    await this.redis.set(`unread:${userId}`, count, 'EX', 300);

    return count;
  }
}
```

## Troubleshooting

### WebSocket Connection Issues

1. **CORS errors**: Check `FRONTEND_URL` in environment variables
2. **Authentication failures**: Verify JWT token in `client.handshake.auth.token`
3. **Connection timeouts**: Check firewall and reverse proxy WebSocket settings

### Encryption Errors

1. **Decryption failed**: Verify `MESSAGING_ENCRYPTION_KEY` is consistent
2. **Invalid key**: Ensure key is 32 bytes (256 bits) base64 encoded
3. **Missing IV/authTag**: Check database schema includes these columns

### Performance Issues

1. **Slow message loading**: Add database indexes
2. **High memory usage**: Implement pagination and limit result sets
3. **WebSocket bottleneck**: Use Redis adapter for horizontal scaling

## Future Enhancements

- [ ] Group conversations (multi-party chats)
- [ ] Voice/video call integration
- [ ] Message reactions and emojis
- [ ] Message translation
- [ ] Advanced search with filters
- [ ] Message templates
- [ ] Scheduled messages
- [ ] Message expiration (self-destruct)
- [ ] Push notifications
- [ ] Email notifications for offline users

## License

Proprietary - VytalWatch RPM Platform

## Support

For issues or questions, contact the development team.
