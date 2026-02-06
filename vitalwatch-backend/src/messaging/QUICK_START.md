# Messaging System - Quick Start Guide

Get the VytalWatch messaging system up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running
- Backend dependencies installed

## Step 1: Install WebSocket Dependencies (1 minute)

```bash
cd /home/user/RMP/vitalwatch-backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## Step 2: Generate Encryption Key (30 seconds)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output.

## Step 3: Configure Environment (1 minute)

Add to your `.env` file:

```env
MESSAGING_ENCRYPTION_KEY=<paste-key-from-step-2>
FRONTEND_URL=http://localhost:3000
```

## Step 4: Create Database Tables (1 minute)

Run this SQL in your PostgreSQL database:

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  deleted_at TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes
CREATE INDEX idx_conversations_patient_provider ON conversations(patient_id, provider_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at);
```

## Step 5: Register Module (1 minute)

Edit `/src/app.module.ts`:

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

## Step 6: Start the Server (30 seconds)

```bash
npm run start:dev
```

## Test It Works (1 minute)

### Test REST API

```bash
# Get your auth token first, then:
curl -X POST http://localhost:3000/messaging/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "providerId": "provider-uuid"
  }'
```

### Test WebSocket

```bash
npm install -g wscat
wscat -c "ws://localhost:3000/messaging?userId=your-user-id"
```

## Frontend Integration

### React Example

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

function Chat({ conversationId, authToken }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Connect WebSocket
    const ws = io('http://localhost:3000/messaging', {
      auth: { token: authToken }
    });

    ws.on('message:new', (data) => {
      // Load new message
      loadMessage(data.messageId);
    });

    setSocket(ws);
    return () => ws.close();
  }, []);

  const sendMessage = async (content) => {
    // Send via REST
    const res = await axios.post(
      `/messaging/conversations/${conversationId}/messages`,
      { content, type: 'text' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    // Notify via WebSocket
    socket.emit('message:sent', {
      conversationId,
      messageId: res.data.id
    });
  };

  return <div>{/* Your chat UI */}</div>;
}
```

## Common Commands

```bash
# Install dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Start dev server
npm run start:dev

# Run tests
npm test

# Build for production
npm run build
npm run start:prod
```

## API Endpoints Cheat Sheet

```bash
# Create conversation
POST /messaging/conversations

# List conversations
GET /messaging/conversations

# Send message
POST /messaging/conversations/:id/messages

# Get messages
GET /messaging/conversations/:id/messages?page=1&limit=50

# Mark as read
PATCH /messaging/messages/:id/read

# Unread count
GET /messaging/conversations/unread-count

# Search
GET /messaging/messages/search?q=keyword

# Delete
DELETE /messaging/messages/:id
```

## WebSocket Events Cheat Sheet

```javascript
// Connect
const socket = io('http://localhost:3000/messaging', {
  auth: { token: yourToken }
});

// Join conversation
socket.emit('conversation:join', { conversationId });

// Send typing indicator
socket.emit('typing', { conversationId, isTyping: true });

// Listen for new messages
socket.on('message:new', (data) => {
  console.log('New message:', data);
});

// Listen for typing
socket.on('typing', (data) => {
  console.log('User typing:', data);
});
```

## Troubleshooting

### "Cannot find module '@nestjs/websockets'"
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### "Encryption key not set"
Add to `.env`:
```env
MESSAGING_ENCRYPTION_KEY=<your-generated-key>
```

### "Table does not exist"
Run the SQL from Step 4 in your database.

### WebSocket won't connect
Check `.env` has:
```env
FRONTEND_URL=http://localhost:3000
```

## Next Steps

1. **Production Setup**: See [SETUP.md](./SETUP.md)
2. **Full Documentation**: See [README.md](./README.md)
3. **Dependencies**: See [DEPENDENCIES.md](./DEPENDENCIES.md)
4. **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Need Help?

- Check logs: `npm run start:dev` shows detailed error messages
- Review [SETUP.md](./SETUP.md) for detailed setup instructions
- Check the example code in [README.md](./README.md)

---

**Total Setup Time**: ~5 minutes
**Difficulty**: Easy
**Status**: Ready to use!
