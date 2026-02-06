import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagingService } from '../src/messaging/messaging.service';
import { Conversation } from '../src/messaging/entities/conversation.entity';
import { Message, MessageType, MessageStatus } from '../src/messaging/entities/message.entity';
import { AuditLog } from '../src/audit/entities/audit-log.entity';

describe('MessagingService', () => {
  let service: MessagingService;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<Message>;
  let auditRepository: Repository<AuditLog>;
  let configService: ConfigService;

  const mockConversationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    conversationRepository = module.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    messageRepository = module.get<Repository<Message>>(getRepositoryToken(Message));
    auditRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    configService = module.get<ConfigService>(ConfigService);

    mockConfigService.get.mockReturnValue('test-encryption-key-32-chars!!!');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    const createConversationDto = {
      patientId: 'patient-123',
      providerId: 'provider-456',
      subject: 'Test Conversation',
      priority: 'normal',
      initialMessage: 'Hello, Doctor',
    };

    it('should create a new conversation successfully', async () => {
      // Arrange
      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
        encryptionKeyId: 'key-123',
        metadata: {
          subject: 'Test Conversation',
          priority: 'normal',
          tags: [],
        },
        createdAt: new Date(),
      };

      mockConversationRepository.findOne.mockResolvedValue(null);
      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue(mockConversation);

      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        content: 'Hello, Doctor',
      };
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);

      mockAuditRepository.create.mockReturnValue({});
      mockAuditRepository.save.mockResolvedValue({});

      // Act
      const result = await service.createConversation(createConversationDto, 'patient-123');

      // Assert
      expect(conversationRepository.create).toHaveBeenCalled();
      expect(conversationRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('conv-123');
    });

    it('should return existing conversation if already exists', async () => {
      // Arrange
      const existingConversation = {
        id: 'existing-conv',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      mockConversationRepository.findOne.mockResolvedValue(existingConversation);

      // Act
      const result = await service.createConversation(
        createConversationDto,
        'patient-123',
      );

      // Assert
      expect(result).toEqual(existingConversation);
      expect(conversationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    const sendMessageDto = {
      content: 'Hello, this is a test message',
      type: MessageType.TEXT,
    };

    it('should send an encrypted message successfully', async () => {
      // Arrange
      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
        encryptionKeyId: 'key-123',
      };

      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'patient-123',
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        encryptedContent: 'encrypted-content',
        iv: 'initialization-vector',
        authTag: 'auth-tag',
        createdAt: new Date(),
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      mockAuditRepository.create.mockReturnValue({});
      mockAuditRepository.save.mockResolvedValue({});

      // Act
      const result = await service.sendMessage('conv-123', sendMessageDto, 'patient-123');

      // Assert
      expect(messageRepository.create).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(MessageStatus.SENT);
    });

    it('should throw ForbiddenException if user not part of conversation', async () => {
      // Arrange
      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      // Act & Assert
      await expect(
        service.sendMessage('conv-123', sendMessageDto, 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate file attachments', async () => {
      // Arrange
      const messageWithLargeFile = {
        content: 'File attached',
        type: MessageType.FILE,
        attachments: [
          {
            fileName: 'large-file.pdf',
            fileSize: 100 * 1024 * 1024, // 100MB (exceeds limit)
            mimeType: 'application/pdf',
            url: 'https://example.com/file.pdf',
          },
        ],
      };

      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      // Act & Assert
      await expect(
        service.sendMessage('conv-123', messageWithLargeFile, 'patient-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject disallowed MIME types', async () => {
      // Arrange
      const messageWithDisallowedFile = {
        content: 'File attached',
        type: MessageType.FILE,
        attachments: [
          {
            fileName: 'script.exe',
            fileSize: 1024,
            mimeType: 'application/x-msdownload',
            url: 'https://example.com/script.exe',
          },
        ],
      };

      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      // Act & Assert
      await expect(
        service.sendMessage('conv-123', messageWithDisallowedFile, 'patient-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMessages', () => {
    it('should return decrypted messages for a conversation', async () => {
      // Arrange
      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          senderId: 'patient-123',
          encryptedContent: 'encrypted-1',
          iv: 'iv-1',
          authTag: 'tag-1',
          type: MessageType.TEXT,
          createdAt: new Date(),
        },
      ];

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMessages),
      };

      mockMessageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getMessages('conv-123', 'patient-123', {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.decryptedMessages).toHaveLength(1);
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read and update unread count', async () => {
      // Arrange
      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
        patientUnreadCount: 5,
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.update.mockResolvedValue({ affected: 2 });
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await service.markMessagesAsRead('conv-123', ['msg-1', 'msg-2'], 'patient-123');

      // Assert
      expect(messageRepository.update).toHaveBeenCalled();
      expect(conversationRepository.update).toHaveBeenCalledWith('conv-123', {
        patientUnreadCount: 0,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread message count for a user', async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '15' }),
      };

      mockConversationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getUnreadCount('patient-123');

      // Assert
      expect(result).toBe(15);
    });
  });

  describe('searchMessages', () => {
    it('should search and return matching messages across conversations', async () => {
      // Arrange
      const mockConversations = [
        { id: 'conv-1', patientId: 'patient-123' },
        { id: 'conv-2', patientId: 'patient-123' },
      ];

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          encryptedContent: 'encrypted-hello',
          iv: 'iv-1',
          authTag: 'tag-1',
          type: MessageType.TEXT,
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockConversationRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockConversations),
      });

      mockMessageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.searchMessages('patient-123', 'test query');

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete a message', async () => {
      // Arrange
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'patient-123',
        canBeDeletedBy: jest.fn().mockReturnValue(true),
      };

      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      mockMessageRepository.findOne.mockResolvedValue(mockMessage);
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.save.mockResolvedValue({
        ...mockMessage,
        deletedAt: new Date(),
      });

      mockAuditRepository.create.mockReturnValue({});
      mockAuditRepository.save.mockResolvedValue({});

      // Act
      await service.deleteMessage('msg-123', 'patient-123');

      // Assert
      expect(messageRepository.save).toHaveBeenCalled();
      const savedMessage = mockMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.deletedAt).toBeDefined();
    });

    it('should throw ForbiddenException if user cannot delete message', async () => {
      // Arrange
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        senderId: 'other-user',
        canBeDeletedBy: jest.fn().mockReturnValue(false),
      };

      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
      };

      mockMessageRepository.findOne.mockResolvedValue(mockMessage);
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      // Act & Assert
      await expect(service.deleteMessage('msg-123', 'patient-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('setTypingIndicator', () => {
    it('should update typing indicator for a conversation', async () => {
      // Arrange
      const mockConversation = {
        id: 'conv-123',
        patientId: 'patient-123',
        providerId: 'provider-456',
        metadata: {},
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockConversationRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await service.setTypingIndicator('conv-123', 'patient-123', true);

      // Assert
      expect(conversationRepository.update).toHaveBeenCalledWith('conv-123', {
        metadata: { patientTyping: true },
      });
    });
  });
});
