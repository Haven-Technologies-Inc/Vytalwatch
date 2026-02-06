import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageType, MessageStatus } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { EncryptionUtil } from './utils/encryption.util';
import { AuditLog, AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly masterEncryptionKey: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly configService: ConfigService,
  ) {
    // In production, this should be loaded from a secure key management service (AWS KMS, Azure Key Vault, etc.)
    this.masterEncryptionKey =
      this.configService.get<string>('MESSAGING_ENCRYPTION_KEY') ||
      EncryptionUtil.generateKey();

    if (!this.configService.get<string>('MESSAGING_ENCRYPTION_KEY')) {
      this.logger.warn(
        'MESSAGING_ENCRYPTION_KEY not set. Using generated key (NOT RECOMMENDED FOR PRODUCTION)',
      );
    }
  }

  /**
   * Create a new conversation between patient and provider
   */
  async createConversation(
    createDto: CreateConversationDto,
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<Conversation> {
    // Check if conversation already exists
    const existing = await this.conversationRepository.findOne({
      where: {
        patientId: createDto.patientId,
        providerId: createDto.providerId,
        deletedAt: null as any,
      },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    const conversation = this.conversationRepository.create({
      patientId: createDto.patientId,
      providerId: createDto.providerId,
      encryptionKeyId: EncryptionUtil.generateToken(16),
      metadata: {
        subject: createDto.subject,
        priority: createDto.priority || 'normal',
        tags: [],
      },
    });

    const saved = await this.conversationRepository.save(conversation);

    // Send initial message if provided
    if (createDto.initialMessage) {
      await this.sendMessage(
        saved.id,
        {
          content: createDto.initialMessage,
          type: MessageType.TEXT,
        },
        userId,
        metadata,
      );
    }

    // Create audit log
    await this.createAuditLog(
      AuditAction.USER_CREATED,
      userId,
      'conversation',
      saved.id,
      {
        patientId: createDto.patientId,
        providerId: createDto.providerId,
      },
      metadata?.ipAddress,
      metadata?.userAgent,
    );

    return saved;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    archived: boolean = false,
  ): Promise<Conversation[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.patient', 'patient')
      .leftJoinAndSelect('conversation.provider', 'provider')
      .where('(conversation.patientId = :userId OR conversation.providerId = :userId)', {
        userId,
      })
      .andWhere('conversation.deletedAt IS NULL')
      .andWhere(
        `(
          (conversation.patientId = :userId AND conversation.patientArchived = :archived) OR
          (conversation.providerId = :userId AND conversation.providerArchived = :archived)
        )`,
        { userId, archived },
      )
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();

    return conversations;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, deletedAt: null as any },
      relations: ['patient', 'provider'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is participant
    if (conversation.patientId !== userId && conversation.providerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return conversation;
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    sendDto: SendMessageDto,
    senderId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<Message> {
    // Get and validate conversation
    const conversation = await this.getConversation(conversationId, senderId);

    // Validate file attachments
    if (sendDto.attachments && sendDto.attachments.length > 0) {
      this.validateAttachments(sendDto.attachments);
    }

    // Get encryption key for this conversation
    const conversationKey = EncryptionUtil.deriveKey(
      this.masterEncryptionKey,
      conversationId,
    );

    // Encrypt message content
    let encryptedData;
    let plainContent = null;

    if (sendDto.type === MessageType.SYSTEM) {
      // System messages are not encrypted for easier debugging
      plainContent = sendDto.content;
      encryptedData = {
        encryptedContent: '',
        iv: '',
        authTag: '',
      };
    } else {
      encryptedData = EncryptionUtil.encrypt(sendDto.content, conversationKey);
    }

    // Process attachments (encrypt file URLs)
    let processedAttachments = null;
    if (sendDto.attachments && sendDto.attachments.length > 0) {
      processedAttachments = sendDto.attachments.map((attachment) => ({
        id: EncryptionUtil.generateToken(8),
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        encryptedUrl: attachment.url, // In production, encrypt this
        scannedForVirus: false, // Will be set by background job
        virusScanResult: null,
      }));
    }

    // Create message
    const message = this.messageRepository.create({
      conversationId,
      senderId,
      type: sendDto.type || MessageType.TEXT,
      status: MessageStatus.SENT,
      encryptedContent: encryptedData.encryptedContent,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      plainContent,
      attachments: processedAttachments,
      replyToMessageId: sendDto.replyToMessageId,
      metadata: {
        priority: sendDto.priority,
        mentions: sendDto.mentions,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    const saved = await this.messageRepository.save(message);

    // Update conversation
    const recipientId =
      conversation.patientId === senderId ? conversation.providerId : conversation.patientId;
    const updateData: any = {
      lastMessageId: saved.id,
      lastMessagePreview: this.getMessagePreview(sendDto.content, sendDto.type),
      lastMessageAt: saved.createdAt,
    };

    // Increment unread count for recipient
    if (recipientId === conversation.patientId) {
      updateData.patientUnreadCount = () => 'patient_unread_count + 1';
    } else {
      updateData.providerUnreadCount = () => 'provider_unread_count + 1';
    }

    await this.conversationRepository.update(conversationId, updateData);

    // Create audit log
    await this.createAuditLog(
      AuditAction.USER_CREATED,
      senderId,
      'message',
      saved.id,
      {
        conversationId,
        type: sendDto.type,
        hasAttachments: !!sendDto.attachments,
      },
      metadata?.ipAddress,
      metadata?.userAgent,
    );

    return saved;
  }

  /**
   * Get messages in a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    query: QueryMessagesDto,
  ): Promise<{ messages: Message[]; total: number; decryptedMessages: any[] }> {
    // Validate access
    await this.getConversation(conversationId, userId);

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyToMessage', 'replyToMessage')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.deletedAt IS NULL');

    // Apply filters
    if (query.type) {
      queryBuilder.andWhere('message.type = :type', { type: query.type });
    }

    if (query.status) {
      queryBuilder.andWhere('message.status = :status', { status: query.status });
    }

    if (query.afterDate) {
      queryBuilder.andWhere('message.createdAt > :afterDate', {
        afterDate: new Date(query.afterDate),
      });
    }

    if (query.beforeDate) {
      queryBuilder.andWhere('message.createdAt < :beforeDate', {
        beforeDate: new Date(query.beforeDate),
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (query.page - 1) * query.limit;
    queryBuilder.skip(skip).take(query.limit).orderBy('message.createdAt', 'DESC');

    const messages = await queryBuilder.getMany();

    // Decrypt messages
    const conversationKey = EncryptionUtil.deriveKey(
      this.masterEncryptionKey,
      conversationId,
    );

    const decryptedMessages = messages.map((message) => {
      let content = message.plainContent;

      if (!content && message.encryptedContent) {
        try {
          content = EncryptionUtil.decrypt(
            {
              encryptedContent: message.encryptedContent,
              iv: message.iv,
              authTag: message.authTag,
            },
            conversationKey,
          );
        } catch (error) {
          this.logger.error(
            `Failed to decrypt message ${message.id}: ${error.message}`,
          );
          content = '[Decryption failed]';
        }
      }

      return {
        ...message,
        content,
        encryptedContent: undefined,
        iv: undefined,
        authTag: undefined,
      };
    });

    return { messages, total, decryptedMessages };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    // Validate access
    const conversation = await this.getConversation(conversationId, userId);

    // Update message status
    await this.messageRepository.update(
      {
        id: In(messageIds),
        conversationId,
        senderId: Not(userId) as any,
      },
      {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    );

    // Reset unread count for user
    const updateData: any = {};
    if (userId === conversation.patientId) {
      updateData.patientUnreadCount = 0;
    } else if (userId === conversation.providerId) {
      updateData.providerUnreadCount = 0;
    }

    if (Object.keys(updateData).length > 0) {
      await this.conversationRepository.update(conversationId, updateData);
    }
  }

  /**
   * Mark a single message as read
   */
  async markMessageAsRead(
    messageId: string,
    userId: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Validate access
    await this.getConversation(message.conversationId, userId);

    // Can only mark messages you didn't send as read
    if (message.senderId === userId) {
      return message;
    }

    message.status = MessageStatus.READ;
    message.readAt = new Date();

    const updated = await this.messageRepository.save(message);

    // Decrement unread count
    const conversation = message.conversation;
    if (userId === conversation.patientId && conversation.patientUnreadCount > 0) {
      await this.conversationRepository.decrement(
        { id: conversation.id },
        'patientUnreadCount',
        1,
      );
    } else if (
      userId === conversation.providerId &&
      conversation.providerUnreadCount > 0
    ) {
      await this.conversationRepository.decrement(
        { id: conversation.id },
        'providerUnreadCount',
        1,
      );
    }

    return updated;
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.conversationRepository
      .createQueryBuilder('conversation')
      .select('SUM(CASE WHEN conversation.patientId = :userId THEN conversation.patientUnreadCount ELSE conversation.providerUnreadCount END)', 'total')
      .where('(conversation.patientId = :userId OR conversation.providerId = :userId)', {
        userId,
      })
      .andWhere('conversation.deletedAt IS NULL')
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * Search messages across all conversations
   */
  async searchMessages(
    userId: string,
    searchQuery: string,
    limit: number = 50,
  ): Promise<any[]> {
    // Get user's conversations
    const conversations = await this.getUserConversations(userId);
    const conversationIds = conversations.map((c) => c.id);

    if (conversationIds.length === 0) {
      return [];
    }

    // Search in messages (this is a simplified version - in production use full-text search)
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .where('message.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('message.deletedAt IS NULL')
      .andWhere('message.type = :type', { type: MessageType.TEXT })
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();

    // Decrypt and filter by search query
    const results = [];
    for (const message of messages) {
      const conversationKey = EncryptionUtil.deriveKey(
        this.masterEncryptionKey,
        message.conversationId,
      );

      try {
        const decrypted = EncryptionUtil.decrypt(
          {
            encryptedContent: message.encryptedContent,
            iv: message.iv,
            authTag: message.authTag,
          },
          conversationKey,
        );

        if (decrypted.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            ...message,
            content: decrypted,
            encryptedContent: undefined,
            iv: undefined,
            authTag: undefined,
          });
        }
      } catch (error) {
        // Skip messages that can't be decrypted
        continue;
      }
    }

    return results;
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Validate access
    await this.getConversation(message.conversationId, userId);

    // Can only delete own messages
    if (!message.canBeDeletedBy(userId)) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.deletedAt = new Date();
    message.metadata = {
      ...message.metadata,
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    };

    await this.messageRepository.save(message);

    // Create audit log
    await this.createAuditLog(
      AuditAction.USER_DELETED,
      userId,
      'message',
      messageId,
      {},
      metadata?.ipAddress,
      metadata?.userAgent,
    );
  }

  /**
   * Update typing indicator status
   */
  async setTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);

    const metadata = conversation.metadata || {};

    if (userId === conversation.patientId) {
      metadata.patientTyping = isTyping;
    } else if (userId === conversation.providerId) {
      metadata.providerTyping = isTyping;
    }

    await this.conversationRepository.update(conversationId, { metadata });
  }

  // Private helper methods

  private validateAttachments(attachments: any[]): void {
    for (const attachment of attachments) {
      // Check file size
      if (attachment.fileSize > this.maxFileSize) {
        throw new BadRequestException(
          `File ${attachment.fileName} exceeds maximum size of ${this.maxFileSize / 1024 / 1024}MB`,
        );
      }

      // Check MIME type
      if (!this.allowedMimeTypes.includes(attachment.mimeType)) {
        throw new BadRequestException(
          `File type ${attachment.mimeType} is not allowed`,
        );
      }
    }
  }

  private getMessagePreview(content: string, type: MessageType): string {
    if (type === MessageType.IMAGE) {
      return '📷 Image';
    } else if (type === MessageType.FILE) {
      return '📎 File';
    } else if (type === MessageType.SYSTEM) {
      return content.substring(0, 100);
    }
    return content.substring(0, 100);
  }

  private async createAuditLog(
    action: AuditAction,
    userId: string,
    resourceType: string,
    resourceId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const auditLog = this.auditRepository.create({
        action,
        userId,
        resourceType,
        resourceId,
        details,
        ipAddress,
        userAgent,
      });
      await this.auditRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }
}

// Import Not operator
import { Not } from 'typeorm';
