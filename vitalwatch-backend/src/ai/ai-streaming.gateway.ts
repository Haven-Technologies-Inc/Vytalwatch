import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { AIConversation } from './entities/ai-conversation.entity';
import { AIMessage, AIMessageRole, AIMessageStatus } from './entities/ai-message.entity';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { StreamChatDto } from './dto/stream-chat.dto';

interface StreamingSession {
  conversationId?: string;
  messageId?: string;
  userId: string;
  startTime: number;
  chunks: string[];
  controller?: AbortController;
}

@WebSocketGateway({
  namespace: 'ai',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AIStreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AIStreamingGateway.name);
  private openai: OpenAI;
  private grokClient: OpenAI;
  private activeSessions: Map<string, StreamingSession> = new Map();

  // Rate limiting: max concurrent streams per user
  private readonly MAX_CONCURRENT_STREAMS = 3;
  private userStreamCounts: Map<string, number> = new Map();

  constructor(
    @InjectRepository(AIConversation)
    private readonly conversationRepository: Repository<AIConversation>,
    @InjectRepository(AIMessage)
    private readonly messageRepository: Repository<AIMessage>,
    private readonly configService: ConfigService,
  ) {
    this.initializeClients();
  }

  private initializeClients(): void {
    const openaiKey = this.configService.get('openai.apiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const grokKey = this.configService.get('grok.apiKey');
    const grokBaseUrl = this.configService.get('grok.baseUrl');
    if (grokKey && grokBaseUrl) {
      this.grokClient = new OpenAI({
        apiKey: grokKey,
        baseURL: grokBaseUrl,
      });
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up any active sessions for this client
    const session = this.activeSessions.get(client.id);
    if (session) {
      session.controller?.abort();
      this.decrementUserStreamCount(session.userId);
      this.activeSessions.delete(client.id);
    }
  }

  /**
   * Stream AI chat response
   */
  @SubscribeMessage('stream-chat')
  async handleStreamChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StreamChatDto & { userId: string },
  ) {
    const { userId, conversationId, messages, model, temperature, maxTokens, systemPrompt } = data;

    try {
      // Rate limiting check
      if (!this.canStartStream(userId)) {
        client.emit('stream-error', {
          error: 'Too many concurrent streams. Please wait for existing streams to complete.',
        });
        return;
      }

      this.incrementUserStreamCount(userId);

      // Get or create conversation
      let conversation: AIConversation;
      if (conversationId) {
        conversation = await this.conversationRepository.findOne({
          where: { id: conversationId, userId },
          relations: ['messages'],
        });

        if (!conversation) {
          throw new Error('Conversation not found');
        }
      }

      // Create user message if there's a new user message
      const lastMessage = messages[messages.length - 1];
      let userMessage: AIMessage;

      if (lastMessage.role === 'user' && conversation) {
        userMessage = this.messageRepository.create({
          conversationId: conversation.id,
          role: AIMessageRole.USER,
          content: lastMessage.content,
          status: AIMessageStatus.COMPLETED,
        });
        await this.messageRepository.save(userMessage);
      }

      // Create assistant message
      const assistantMessage = conversation
        ? this.messageRepository.create({
            conversationId: conversation.id,
            role: AIMessageRole.ASSISTANT,
            content: '',
            status: AIMessageStatus.STREAMING,
            streamStartedAt: new Date(),
          })
        : null;

      const savedAssistantMessage = assistantMessage
        ? await this.messageRepository.save(assistantMessage)
        : null;

      // Initialize streaming session
      const controller = new AbortController();
      const session: StreamingSession = {
        conversationId: conversation?.id,
        messageId: savedAssistantMessage?.id,
        userId,
        startTime: Date.now(),
        chunks: [],
        controller,
      };

      this.activeSessions.set(client.id, session);

      // Prepare messages for AI
      const aiMessages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

      // Get AI client
      const aiClient = this.openai || this.grokClient;
      if (!aiClient) {
        throw new Error('No AI client configured');
      }

      const aiModel = model || conversation?.model || this.configService.get('openai.model') || 'gpt-4';

      // Start streaming
      client.emit('stream-start', {
        messageId: savedAssistantMessage?.id,
        conversationId: conversation?.id,
      });

      const stream = await aiClient.chat.completions.create({
        model: aiModel,
        messages: aiMessages as any,
        temperature: temperature || conversation?.settings?.temperature || 0.7,
        max_tokens: maxTokens || conversation?.settings?.maxTokens || 1000,
        stream: true,
      }, {
        signal: controller.signal,
      });

      let fullContent = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';

        if (delta) {
          fullContent += delta;
          session.chunks.push(delta);
          chunkCount++;

          // Emit chunk to client
          client.emit('stream-chunk', {
            messageId: savedAssistantMessage?.id,
            chunk: delta,
            chunkIndex: chunkCount,
          });

          // Emit progress
          if (chunkCount % 10 === 0) {
            client.emit('stream-progress', {
              messageId: savedAssistantMessage?.id,
              totalChunks: chunkCount,
              estimatedTokens: Math.ceil(fullContent.length / 4),
            });
          }
        }

        // Check for finish reason
        if (chunk.choices[0]?.finish_reason) {
          break;
        }
      }

      // Stream completed
      const responseTime = Date.now() - session.startTime;

      // Update assistant message
      if (savedAssistantMessage) {
        savedAssistantMessage.content = fullContent;
        savedAssistantMessage.status = AIMessageStatus.COMPLETED;
        savedAssistantMessage.streamCompletedAt = new Date();
        savedAssistantMessage.streamChunks = chunkCount;
        savedAssistantMessage.responseTime = responseTime;
        savedAssistantMessage.model = aiModel;

        // Calculate tokens (approximate)
        const estimatedPromptTokens = Math.ceil(
          aiMessages.reduce((sum, m) => sum + m.content.length, 0) / 4,
        );
        const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

        savedAssistantMessage.promptTokens = estimatedPromptTokens;
        savedAssistantMessage.completionTokens = estimatedCompletionTokens;
        savedAssistantMessage.totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

        // Calculate cost
        const pricing = this.getPricing(aiModel);
        savedAssistantMessage.cost = parseFloat(
          ((estimatedPromptTokens * pricing.prompt) / 1000 +
            (estimatedCompletionTokens * pricing.completion) / 1000).toFixed(6),
        );

        await this.messageRepository.save(savedAssistantMessage);

        // Update conversation
        if (conversation) {
          conversation.messageCount += 2; // User + assistant
          conversation.totalTokens += savedAssistantMessage.totalTokens;
          conversation.addToTotalCost(savedAssistantMessage.cost);
          conversation.lastMessageId = savedAssistantMessage.id;
          conversation.lastMessagePreview = fullContent.substring(0, 200);
          conversation.lastMessageAt = new Date();
          await this.conversationRepository.save(conversation);
        }
      }

      // Emit completion
      client.emit('stream-complete', {
        messageId: savedAssistantMessage?.id,
        conversationId: conversation?.id,
        content: fullContent,
        totalChunks: chunkCount,
        responseTime,
        tokens: savedAssistantMessage?.totalTokens,
        cost: savedAssistantMessage?.cost,
      });

      // Clean up
      this.activeSessions.delete(client.id);
      this.decrementUserStreamCount(userId);

    } catch (error) {
      this.logger.error('Streaming error:', error);

      const session = this.activeSessions.get(client.id);

      // Update message status to failed if applicable
      if (session?.messageId) {
        const message = await this.messageRepository.findOne({
          where: { id: session.messageId },
        });

        if (message) {
          message.status = AIMessageStatus.FAILED;
          message.error = error.message;
          message.errorCode = error.code;
          await this.messageRepository.save(message);
        }
      }

      client.emit('stream-error', {
        error: error.message,
        messageId: session?.messageId,
      });

      // Clean up
      if (session) {
        this.decrementUserStreamCount(session.userId);
        this.activeSessions.delete(client.id);
      }
    }
  }

  /**
   * Stop streaming
   */
  @SubscribeMessage('stop-stream')
  handleStopStream(@ConnectedSocket() client: Socket) {
    const session = this.activeSessions.get(client.id);

    if (session) {
      session.controller?.abort();

      // Update message status
      if (session.messageId) {
        this.messageRepository.update(session.messageId, {
          status: AIMessageStatus.STOPPED,
          content: session.chunks.join(''),
          streamCompletedAt: new Date(),
          streamChunks: session.chunks.length,
        });
      }

      client.emit('stream-stopped', {
        messageId: session.messageId,
        chunks: session.chunks.length,
      });

      this.decrementUserStreamCount(session.userId);
      this.activeSessions.delete(client.id);
    }
  }

  /**
   * Check typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast typing indicator to other participants in the conversation
    client.broadcast.to(`conversation-${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Join conversation room
   */
  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation-${data.conversationId}`);
    this.logger.log(`Client ${client.id} joined conversation ${data.conversationId}`);
  }

  /**
   * Leave conversation room
   */
  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation-${data.conversationId}`);
    this.logger.log(`Client ${client.id} left conversation ${data.conversationId}`);
  }

  // Helper methods

  private canStartStream(userId: string): boolean {
    const count = this.userStreamCounts.get(userId) || 0;
    return count < this.MAX_CONCURRENT_STREAMS;
  }

  private incrementUserStreamCount(userId: string): void {
    const count = this.userStreamCounts.get(userId) || 0;
    this.userStreamCounts.set(userId, count + 1);
  }

  private decrementUserStreamCount(userId: string): void {
    const count = this.userStreamCounts.get(userId) || 0;
    if (count > 0) {
      this.userStreamCounts.set(userId, count - 1);
    }
  }

  private getPricing(model: string): { prompt: number; completion: number } {
    const pricing = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'grok-2': { prompt: 0.02, completion: 0.04 },
    };

    return pricing[model] || pricing['gpt-4'];
  }
}
