import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';

/**
 * WebSocket Gateway for real-time messaging features
 *
 * Note: This requires @nestjs/websockets and @nestjs/platform-socket.io packages
 * Install them with: npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
 *
 * To enable CORS, configure in main.ts:
 * const app = await NestFactory.create(AppModule);
 * app.enableCors({
 *   origin: process.env.FRONTEND_URL,
 *   credentials: true,
 * });
 */
@WebSocketGateway({
  namespace: 'messaging',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId
  private readonly typingTimeouts = new Map<string, NodeJS.Timeout>(); // conversationId:userId -> timeout

  constructor(private readonly messagingService: MessagingService) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract user ID from connection handshake
      // In production, validate JWT token from client.handshake.auth.token
      const userId = this.extractUserIdFromSocket(client);

      if (!userId) {
        this.logger.warn(`Connection rejected - no valid user ID`);
        client.disconnect();
        return;
      }

      // Store socket connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);
      this.socketUsers.set(client.id, userId);

      // Join user-specific room
      client.join(`user:${userId}`);

      // Notify user is online
      this.broadcastUserStatus(userId, 'online');

      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: Socket) {
    try {
      const userId = this.socketUsers.get(client.id);

      if (userId) {
        // Remove socket from user's set
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(client.id);

          // If user has no more active sockets, mark as offline
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
            this.broadcastUserStatus(userId, 'offline');
          }
        }

        this.socketUsers.delete(client.id);
        this.logger.log(`User ${userId} disconnected socket ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnection error: ${error.message}`);
    }
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { conversationId, isTyping } = data;

      // Update typing status in database
      await this.messagingService.setTypingIndicator(
        conversationId,
        userId,
        isTyping,
      );

      // Broadcast typing indicator to conversation participants
      this.broadcastToConversation(conversationId, userId, 'typing', {
        conversationId,
        userId,
        isTyping,
      });

      // Auto-clear typing indicator after 5 seconds
      if (isTyping) {
        const timeoutKey = `${conversationId}:${userId}`;

        // Clear existing timeout
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey));
        }

        // Set new timeout
        const timeout = setTimeout(async () => {
          await this.messagingService.setTypingIndicator(
            conversationId,
            userId,
            false,
          );
          this.broadcastToConversation(conversationId, userId, 'typing', {
            conversationId,
            userId,
            isTyping: false,
          });
          this.typingTimeouts.delete(timeoutKey);
        }, 5000);

        this.typingTimeouts.set(timeoutKey, timeout);
      }
    } catch (error) {
      this.logger.error(`Typing indicator error: ${error.message}`);
    }
  }

  /**
   * Handle message sent event (called after message is saved to DB)
   */
  @SubscribeMessage('message:sent')
  async handleMessageSent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { conversationId, messageId } = data;

      // Get the conversation to find recipient
      const conversation = await this.messagingService.getConversation(
        conversationId,
        userId,
      );

      // Determine recipient
      const recipientId =
        conversation.patientId === userId
          ? conversation.providerId
          : conversation.patientId;

      // Emit message to recipient
      this.emitToUser(recipientId, 'message:new', {
        conversationId,
        messageId,
      });

      // Update message status to delivered if recipient is online
      if (this.isUserOnline(recipientId)) {
        this.emitToUser(userId, 'message:delivered', {
          messageId,
          deliveredAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Message sent error: ${error.message}`);
    }
  }

  /**
   * Handle message read event
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { messageId } = data;

      // Mark message as read
      const message = await this.messagingService.markMessageAsRead(
        messageId,
        userId,
      );

      // Notify sender that message was read
      this.emitToUser(message.senderId, 'message:read', {
        messageId,
        readAt: message.readAt,
      });
    } catch (error) {
      this.logger.error(`Message read error: ${error.message}`);
    }
  }

  /**
   * Handle join conversation room
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = this.socketUsers.get(client.id);
      if (!userId) return;

      const { conversationId } = data;

      // Validate user has access to conversation
      await this.messagingService.getConversation(conversationId, userId);

      // Join conversation room
      client.join(`conversation:${conversationId}`);

      this.logger.log(
        `User ${userId} joined conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Join conversation error: ${error.message}`);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  /**
   * Handle leave conversation room
   */
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const { conversationId } = data;

      // Leave conversation room
      client.leave(`conversation:${conversationId}`);

      const userId = this.socketUsers.get(client.id);
      this.logger.log(
        `User ${userId} left conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(`Leave conversation error: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Extract user ID from socket connection
   * In production, validate JWT token from client.handshake.auth.token
   */
  private extractUserIdFromSocket(client: Socket): string | null {
    // Option 1: From auth token (recommended for production)
    const token = client.handshake.auth?.token;
    if (token) {
      // Validate and decode JWT token here
      // const decoded = this.jwtService.verify(token);
      // return decoded.userId;
    }

    // Option 2: From query params (for development/testing only)
    const userId = client.handshake.query?.userId as string;
    if (userId) {
      return userId;
    }

    return null;
  }

  /**
   * Check if user is currently online
   */
  private isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Emit event to a specific user (all their connected sockets)
   */
  private emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to conversation participants (excluding sender)
   */
  private async broadcastToConversation(
    conversationId: string,
    excludeUserId: string,
    event: string,
    data: any,
  ) {
    try {
      const conversation = await this.messagingService.getConversation(
        conversationId,
        excludeUserId,
      );

      const participants = [conversation.patientId, conversation.providerId];

      for (const participantId of participants) {
        if (participantId !== excludeUserId) {
          this.emitToUser(participantId, event, data);
        }
      }
    } catch (error) {
      this.logger.error(`Broadcast error: ${error.message}`);
    }
  }

  /**
   * Broadcast user online/offline status
   */
  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    this.server.emit('user:status', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  /**
   * Public method to emit new message (called from service/controller)
   */
  emitNewMessage(conversationId: string, messageId: string, recipientId: string) {
    this.emitToUser(recipientId, 'message:new', {
      conversationId,
      messageId,
    });
  }

  /**
   * Public method to emit message delivery confirmation
   */
  emitMessageDelivered(messageId: string, senderId: string) {
    this.emitToUser(senderId, 'message:delivered', {
      messageId,
      deliveredAt: new Date(),
    });
  }

  /**
   * Public method to emit message read confirmation
   */
  emitMessageRead(messageId: string, senderId: string, readAt: Date) {
    this.emitToUser(senderId, 'message:read', {
      messageId,
      readAt,
    });
  }
}
