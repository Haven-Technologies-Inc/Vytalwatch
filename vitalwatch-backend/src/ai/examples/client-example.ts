/**
 * Client-side Example Usage for VitalWatch AI Module
 *
 * This file demonstrates how to use the AI module from a frontend application
 * using both REST API and WebSocket connections.
 */

import io from 'socket.io-client';

// ============================================================================
// REST API Examples
// ============================================================================

class AIClient {
  private apiUrl: string;
  private token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Create a new conversation
  async createConversation(data: {
    title: string;
    type?: 'general_chat' | 'vital_analysis' | 'patient_insight';
    context?: string;
    model?: string;
  }) {
    return this.fetch('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // List conversations
  async listConversations(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    return this.fetch(`/ai/conversations?${queryString}`);
  }

  // Get conversation with messages
  async getConversation(conversationId: string) {
    return this.fetch(`/ai/conversations/${conversationId}`);
  }

  // Send message and get response
  async sendMessage(conversationId: string, content: string) {
    return this.fetch(`/ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Get conversation summary
  async getSummary(conversationId: string) {
    return this.fetch(`/ai/conversations/${conversationId}/summary`);
  }

  // Export conversation
  async exportConversation(conversationId: string, format: 'text' | 'json' | 'pdf' = 'text') {
    return this.fetch(`/ai/conversations/${conversationId}/export?format=${format}`);
  }

  // Search conversations
  async searchConversations(query: string, limit: number = 10) {
    return this.fetch(`/ai/conversations/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Get statistics
  async getStats() {
    return this.fetch('/ai/conversations/stats');
  }

  // Update conversation
  async updateConversation(conversationId: string, updates: {
    title?: string;
    tags?: string[];
    archived?: boolean;
    pinned?: boolean;
  }) {
    return this.fetch(`/ai/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Delete conversation
  async deleteConversation(conversationId: string) {
    return this.fetch(`/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Pin/unpin conversation
  async pinConversation(conversationId: string, pinned: boolean) {
    return this.fetch(`/ai/conversations/${conversationId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    });
  }

  // Archive/unarchive conversation
  async archiveConversation(conversationId: string, archived: boolean) {
    return this.fetch(`/ai/conversations/${conversationId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ archived }),
    });
  }

  // Add tags
  async addTags(conversationId: string, tags: string[]) {
    return this.fetch(`/ai/conversations/${conversationId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  // Get all tags
  async getTags() {
    return this.fetch('/ai/tags');
  }
}

// ============================================================================
// WebSocket Streaming Example
// ============================================================================

class AIStreamingClient {
  private socket: any;
  private wsUrl: string;
  private token: string;

  constructor(wsUrl: string, token: string) {
    this.wsUrl = wsUrl;
    this.token = token;
  }

  connect() {
    this.socket = io(this.wsUrl, {
      auth: { token: this.token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to AI streaming server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from AI streaming server');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  streamChat(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    conversationId?: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';

      // Listen for stream events
      this.socket.on('stream-start', (data: any) => {
        console.log('Stream started:', data);
      });

      this.socket.on('stream-chunk', (data: any) => {
        fullResponse += data.chunk;
        // Update UI with new chunk
        this.onChunk?.(data.chunk, data.chunkIndex);
      });

      this.socket.on('stream-progress', (data: any) => {
        this.onProgress?.(data.totalChunks, data.estimatedTokens);
      });

      this.socket.on('stream-complete', (data: any) => {
        this.onComplete?.(data);
        resolve(data);
      });

      this.socket.on('stream-error', (data: any) => {
        this.onError?.(data.error);
        reject(new Error(data.error));
      });

      this.socket.on('stream-stopped', (data: any) => {
        this.onStopped?.(data);
      });

      // Start streaming
      this.socket.emit('stream-chat', {
        userId,
        conversationId,
        messages,
        ...options,
      });
    });
  }

  stopStream() {
    this.socket.emit('stop-stream');
  }

  joinConversation(conversationId: string) {
    this.socket.emit('join-conversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket.emit('leave-conversation', { conversationId });
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    this.socket.emit('typing', { conversationId, isTyping });
  }

  onTyping(callback: (data: { conversationId: string; isTyping: boolean }) => void) {
    this.socket.on('user-typing', callback);
  }

  // Callbacks for events
  onChunk?: (chunk: string, index: number) => void;
  onProgress?: (chunks: number, tokens: number) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  onStopped?: (data: any) => void;
}

// ============================================================================
// React Hook Example
// ============================================================================

// Example React hook for using the AI client
function useAIChat(apiUrl: string, wsUrl: string, token: string) {
  const [client] = useState(() => new AIClient(apiUrl, token));
  const [streamingClient] = useState(() => new AIStreamingClient(wsUrl, token));
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  useEffect(() => {
    streamingClient.connect();
    return () => streamingClient.disconnect();
  }, []);

  const createConversation = async (title: string, type?: string) => {
    const result = await client.createConversation({ title, type });
    setCurrentConversation(result.data);
    return result.data;
  };

  const loadConversations = async () => {
    const result = await client.listConversations();
    setConversations(result.data);
    return result.data;
  };

  const sendMessage = async (content: string, streaming = false) => {
    if (!currentConversation) {
      throw new Error('No active conversation');
    }

    if (streaming) {
      setIsStreaming(true);
      setStreamingContent('');

      streamingClient.onChunk = (chunk) => {
        setStreamingContent(prev => prev + chunk);
      };

      streamingClient.onComplete = () => {
        setIsStreaming(false);
      };

      streamingClient.onError = (error) => {
        setIsStreaming(false);
        console.error('Streaming error:', error);
      };

      await streamingClient.streamChat(
        'user-id', // Get from auth context
        [{ role: 'user', content }],
        currentConversation.id,
      );
    } else {
      const result = await client.sendMessage(currentConversation.id, content);
      return result.data;
    }
  };

  const stopStreaming = () => {
    streamingClient.stopStream();
    setIsStreaming(false);
  };

  return {
    conversations,
    currentConversation,
    isStreaming,
    streamingContent,
    createConversation,
    loadConversations,
    sendMessage,
    stopStreaming,
    client,
    streamingClient,
  };
}

// ============================================================================
// Usage Examples
// ============================================================================

async function exampleUsage() {
  const apiUrl = 'https://api.vitalwatch.com';
  const wsUrl = 'wss://api.vitalwatch.com/ai';
  const token = 'your-jwt-token';

  const client = new AIClient(apiUrl, token);
  const streamingClient = new AIStreamingClient(wsUrl, token);

  // Example 1: Create conversation and send message
  const conversation = await client.createConversation({
    title: 'Health Questions',
    type: 'general_chat',
    model: 'gpt-4',
  });

  console.log('Created conversation:', conversation);

  // Example 2: Send message (non-streaming)
  const response = await client.sendMessage(
    conversation.data.id,
    'What does my blood pressure reading mean?'
  );

  console.log('AI Response:', response);

  // Example 3: Streaming chat
  streamingClient.connect();

  streamingClient.onChunk = (chunk) => {
    process.stdout.write(chunk); // Print chunk as it arrives
  };

  streamingClient.onComplete = (data) => {
    console.log('\n\nStreaming complete!');
    console.log('Total tokens:', data.tokens);
    console.log('Cost:', data.cost);
  };

  await streamingClient.streamChat(
    'user-123',
    [
      { role: 'user', content: 'Explain my recent vital trends' },
    ],
    conversation.data.id,
  );

  // Example 4: Search conversations
  const searchResults = await client.searchConversations('blood pressure');
  console.log('Search results:', searchResults);

  // Example 5: Get statistics
  const stats = await client.getStats();
  console.log('AI usage stats:', stats);

  // Example 6: Export conversation
  const exported = await client.exportConversation(conversation.data.id, 'text');
  console.log('Exported conversation:', exported);
}

// Export for use
export { AIClient, AIStreamingClient, useAIChat, exampleUsage };
