# VytalWatch AI Module - Conversation History & Streaming

## Overview

The enhanced AI module provides comprehensive conversation management, real-time streaming, and enterprise-grade features for VytalWatch RPM's AI capabilities.

## Features

### 1. Conversation Management
- **Persistent Conversations**: Store and retrieve AI conversation history
- **Context Management**: Automatically manage conversation context (last N messages)
- **Conversation Types**: Support for different conversation types (general chat, vital analysis, patient insights, etc.)
- **Metadata Tracking**: Track tokens, costs, response times, and more

### 2. Real-time Streaming
- **WebSocket Support**: Real-time token-by-token streaming via Socket.IO
- **Progress Indicators**: Live progress updates during generation
- **Stop Generation**: Ability to cancel ongoing generation
- **Error Handling**: Robust error handling during streaming

### 3. Security & Compliance
- **Content Filtering**: Detect and prevent prompt injection attacks
- **PHI Detection**: Identify and flag Protected Health Information
- **HIPAA Compliance**: Built-in HIPAA compliance checks
- **Audit Logging**: Track all AI interactions for compliance

### 4. Performance & Cost Optimization
- **Response Caching**: Cache common queries to reduce costs
- **Token Counting**: Accurate token usage tracking
- **Cost Tracking**: Real-time cost calculation and limits
- **Rate Limiting**: Per-user rate limits to prevent abuse

### 5. Advanced Features
- **Conversation Summarization**: Automatic summarization of long conversations
- **Export Capabilities**: Export conversations in multiple formats (text, JSON, PDF)
- **Search**: Full-text search across conversations
- **Tagging**: Categorize conversations with tags
- **Sharing**: Share conversations with providers

## Architecture

### Entities

#### AIConversation
Stores conversation metadata and settings.

```typescript
{
  id: string;
  userId: string;
  title: string;
  type: AIConversationType;
  context?: string;
  messages: AIMessage[];
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  model: string;
  systemPrompt?: string;
  summary?: string;
  tags: string[];
  containsPHI: boolean;
  hipaaCompliant: boolean;
  // ... more fields
}
```

#### AIMessage
Stores individual messages within conversations.

```typescript
{
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'pending' | 'streaming' | 'completed' | 'failed' | 'stopped';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
  responseTime: number;
  // ... more fields
}
```

### Services

#### AIService (Legacy)
Original AI service with basic features (maintained for backward compatibility).

#### AIEnhancedService
New service with full conversation management:
- `createConversation()` - Create new conversation
- `getConversation()` - Retrieve with history
- `listConversations()` - List with filtering/pagination
- `updateConversation()` - Update conversation
- `deleteConversation()` - Soft delete
- `addMessage()` - Add message and get response
- `summarizeConversation()` - Generate summary
- `exportConversation()` - Export in various formats
- `searchConversations()` - Full-text search

### Gateways

#### AIStreamingGateway
WebSocket gateway for real-time streaming:
- `stream-chat` - Stream AI responses
- `stop-stream` - Cancel generation
- `typing` - Typing indicators
- `join-conversation` / `leave-conversation` - Room management

### Utilities

#### ContentFilterUtil
Content safety and filtering:
- Prompt injection detection
- PHI detection and sanitization
- HIPAA compliance checking
- Content validation

#### RateLimiterUtil
Rate limiting and usage tracking:
- Request rate limiting
- Token usage limits
- Cost limits
- Usage statistics

#### ResponseCacheUtil
Response caching for optimization:
- LRU cache implementation
- TTL-based expiration
- Cache statistics
- Smart caching decisions

## API Endpoints

### Conversation Management

```
POST   /ai/conversations              - Create conversation
GET    /ai/conversations              - List conversations
GET    /ai/conversations/:id          - Get conversation
PATCH  /ai/conversations/:id          - Update conversation
DELETE /ai/conversations/:id          - Delete conversation
POST   /ai/conversations/:id/messages - Add message & get response
GET    /ai/conversations/:id/summary  - Get summary
GET    /ai/conversations/:id/export   - Export conversation
```

### Additional Endpoints

```
GET    /ai/conversations/search       - Search conversations
GET    /ai/conversations/stats        - Get statistics
POST   /ai/conversations/:id/share    - Share with provider
GET    /ai/conversations/shared       - Get shared conversations
POST   /ai/conversations/:id/pin      - Pin/unpin
POST   /ai/conversations/:id/archive  - Archive/unarchive
POST   /ai/conversations/:id/tags     - Add tags
GET    /ai/tags                       - Get all tags
```

### Legacy Endpoints (Maintained)

```
POST   /ai/chat                       - Basic chat
POST   /ai/analyze-vitals             - Analyze vitals
POST   /ai/patient-insight            - Patient insights
POST   /ai/health-summary             - Health summary
```

## WebSocket Events

### Client → Server

```javascript
// Stream chat
socket.emit('stream-chat', {
  userId: 'user-id',
  conversationId: 'conv-id', // optional
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
});

// Stop streaming
socket.emit('stop-stream');

// Typing indicator
socket.emit('typing', { conversationId: 'conv-id', isTyping: true });

// Join/leave conversation
socket.emit('join-conversation', { conversationId: 'conv-id' });
socket.emit('leave-conversation', { conversationId: 'conv-id' });
```

### Server → Client

```javascript
// Stream events
socket.on('stream-start', (data) => {
  // { messageId, conversationId }
});

socket.on('stream-chunk', (data) => {
  // { messageId, chunk, chunkIndex }
});

socket.on('stream-progress', (data) => {
  // { messageId, totalChunks, estimatedTokens }
});

socket.on('stream-complete', (data) => {
  // { messageId, conversationId, content, totalChunks, responseTime, tokens, cost }
});

socket.on('stream-error', (data) => {
  // { error, messageId }
});

socket.on('stream-stopped', (data) => {
  // { messageId, chunks }
});

socket.on('user-typing', (data) => {
  // { conversationId, isTyping }
});
```

## Usage Examples

### Create Conversation and Chat

```typescript
// 1. Create conversation
const conversation = await fetch('/ai/conversations', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    title: 'Health Discussion',
    type: 'general_chat',
    model: 'gpt-4',
    temperature: 0.7,
  }),
});

// 2. Add message
const response = await fetch(`/ai/conversations/${conversation.id}/messages`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    content: 'What does my recent blood pressure reading mean?',
    includeContext: true,
  }),
});
```

### Real-time Streaming

```typescript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000/ai', {
  auth: { token: '<jwt-token>' },
});

socket.emit('stream-chat', {
  userId: 'user-123',
  messages: [
    { role: 'user', content: 'Explain my vital trends' },
  ],
  model: 'gpt-4',
  temperature: 0.7,
});

socket.on('stream-chunk', (data) => {
  console.log('Received chunk:', data.chunk);
  // Append to UI
});

socket.on('stream-complete', (data) => {
  console.log('Streaming complete:', data);
});
```

### Search and Filter

```typescript
// Search conversations
const results = await fetch('/ai/conversations/search?q=blood pressure&limit=10', {
  headers: { 'Authorization': 'Bearer <token>' },
});

// List with filters
const filtered = await fetch('/ai/conversations?type=vital_analysis&archived=false&page=1&limit=20', {
  headers: { 'Authorization': 'Bearer <token>' },
});
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Grok Configuration
GROK_API_KEY=gsk_...
GROK_BASE_URL=https://api.x.ai/v1

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
```

### Rate Limits

Default limits by user role:

- **Patient**: 100 req/hour, 50K tokens/day, $1/day
- **Provider**: 500 req/hour, 200K tokens/day, $5/day
- **Admin**: 1000 req/hour, 500K tokens/day, $20/day

## Cost Tracking

The system automatically tracks costs based on token usage:

| Model | Prompt (per 1K tokens) | Completion (per 1K tokens) |
|-------|------------------------|----------------------------|
| GPT-4 | $0.03 | $0.06 |
| GPT-4 Turbo | $0.01 | $0.03 |
| GPT-3.5 Turbo | $0.0005 | $0.0015 |
| Grok-2 | $0.02 | $0.04 |

## Security Best Practices

1. **Content Filtering**: All messages are scanned for prompt injection
2. **PHI Protection**: Automatic PHI detection and flagging
3. **Rate Limiting**: Prevent abuse with per-user limits
4. **Audit Logging**: All AI interactions are logged
5. **HIPAA Compliance**: Built-in compliance checks
6. **Encryption**: Sensitive data should be encrypted at rest

## Database Migration

Run the migration to create tables:

```bash
npm run migration:run
```

Or create manually:

```sql
-- See migration file at src/ai/migrations/001-create-ai-tables.sql
```

## Testing

```bash
# Unit tests
npm run test src/ai

# E2E tests
npm run test:e2e src/ai

# Load testing
npm run test:load src/ai
```

## Monitoring

Key metrics to monitor:

- **Request Rate**: Requests per minute/hour
- **Token Usage**: Tokens consumed per user/day
- **Cost**: Daily/monthly AI costs
- **Response Time**: Average response time
- **Error Rate**: Failed requests percentage
- **Cache Hit Rate**: Cache effectiveness

## Future Enhancements

- [ ] Redis integration for distributed caching
- [ ] PostgreSQL full-text search
- [ ] Advanced analytics and insights
- [ ] Multi-model routing (automatic model selection)
- [ ] Voice input/output support
- [ ] Image analysis integration
- [ ] Fine-tuned models for medical use cases
- [ ] Automated conversation insights
- [ ] Integration with clinical decision support systems

## Support

For issues or questions:
- Email: support@vitalwatch.com
- Documentation: https://docs.vitalwatch.com/ai
- GitHub: https://github.com/vitalwatch/rpm

## License

Copyright © 2024 VytalWatch. All rights reserved.
