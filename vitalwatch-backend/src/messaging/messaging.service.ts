import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message, MessageThread } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationCategory,
} from '../notifications/entities/notification.entity';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageThread)
    private readonly threadRepository: Repository<MessageThread>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getThreads(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [threads, total] = await this.threadRepository
      .createQueryBuilder('thread')
      .innerJoin('thread.participants', 'participant', 'participant.id = :userId', { userId })
      .leftJoinAndSelect('thread.participants', 'allParticipants')
      .leftJoinAndSelect('thread.lastMessage', 'lastMessage')
      .orderBy('thread.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: threads,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getThread(threadId: string, userId: string) {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
      relations: ['participants', 'lastMessage'],
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const isParticipant = thread.participants.some((p) => p.id === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Access denied');
    }

    return thread;
  }

  async createThread(dto: { participantIds: string[]; subject?: string }, creatorId: string) {
    const participantIds = [...new Set([...dto.participantIds, creatorId])];
    const participants = await this.userRepository.find({
      where: { id: In(participantIds) },
    });

    if (participants.length !== participantIds.length) {
      throw new NotFoundException('One or more participants not found');
    }

    const thread = this.threadRepository.create({
      subject: dto.subject,
      participants,
      createdById: creatorId,
    });

    return this.threadRepository.save(thread);
  }

  async getMessages(threadId: string, userId: string, options: { page: number; limit: number }) {
    await this.getThread(threadId, userId);

    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.threadId = :threadId', { threadId })
      .leftJoinAndSelect('message.sender', 'sender')
      .orderBy('message.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: messages.reverse(),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(
    threadId: string,
    dto: { content: string; attachments?: string[] },
    senderId: string,
  ) {
    const thread = await this.getThread(threadId, senderId);

    const message = this.messageRepository.create({
      threadId,
      senderId,
      content: dto.content,
      attachments: dto.attachments,
    });

    const saved = await this.messageRepository.save(message);

    // Update thread's last message
    await this.threadRepository.update(threadId, {
      lastMessageId: saved.id,
      updatedAt: new Date(),
    });

    // Notify other participants
    const otherParticipants = thread.participants.filter((p) => p.id !== senderId);
    for (const participant of otherParticipants) {
      await this.notificationsService.create({
        userId: participant.id,
        type: NotificationType.IN_APP,
        category: NotificationCategory.SYSTEM,
        title: 'New Message',
        body: `You have a new message`,
        data: { threadId, messageId: saved.id },
      });
    }

    return saved;
  }

  async markThreadAsRead(threadId: string, userId: string) {
    await this.getThread(threadId, userId);

    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('threadId = :threadId', { threadId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();
  }

  async markMessageAsRead(messageId: string, userId: string) {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      await this.messageRepository.update(messageId, { readAt: new Date() });
    }
  }

  async getUnreadCount(userId: string) {
    const count = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.thread', 'thread')
      .innerJoin('thread.participants', 'participant', 'participant.id = :userId', { userId })
      .where('message.senderId != :userId', { userId })
      .andWhere('message.readAt IS NULL')
      .getCount();

    return { unreadCount: count };
  }

  async deleteThread(threadId: string, userId: string) {
    const thread = await this.getThread(threadId, userId);

    if (thread.createdById !== userId) {
      throw new ForbiddenException('Only the thread creator can delete it');
    }

    await this.threadRepository.softDelete(threadId);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.softDelete(messageId);
  }
}
