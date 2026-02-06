import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIConversation, AIConversationType } from './entities/ai-conversation.entity';
import { AIMessage, AIMessageRole, AIMessageStatus } from './entities/ai-message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import * as tiktoken from 'tiktoken';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface ConversationContext {
  conversationId: string;
  messages: AIMessage[];
  totalTokens: number;
  withinLimit: boolean;
}

@Injectable()
export class AIEnhancedService {
  private readonly logger = new Logger(AIEnhancedService.name);
  private openai: OpenAI;
  private grokClient: OpenAI;
  private tokenEncoder: any;

  // Pricing per 1K tokens (update as needed)
  private readonly pricing = {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'grok-2': { prompt: 0.02, completion: 0.04 },
  };

  // Context window limits
  private readonly contextLimits = {
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 16385,
    'grok-2': 32768,
  };

  constructor(
    @InjectRepository(AIConversation)
    private readonly conversationRepository: Repository<AIConversation>,
    @InjectRepository(AIMessage)
    private readonly messageRepository: Repository<AIMessage>,
    private readonly configService: ConfigService,
  ) {
    this.initializeClients();
    this.initializeTokenizer();
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

  private initializeTokenizer(): void {
    try {
      this.tokenEncoder = tiktoken.encoding_for_model('gpt-4');
    } catch (error) {
      this.logger.warn('Failed to initialize tokenizer, token counting will be approximate');
    }
  }

  /**
   * Create a new AI conversation
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<AIConversation> {
    const conversation = this.conversationRepository.create({
      userId,
      title: dto.title,
      type: dto.type || AIConversationType.GENERAL_CHAT,
      context: dto.context,
      systemPrompt: dto.systemPrompt || this.getDefaultSystemPrompt(dto.type),
      model: dto.model || this.configService.get('openai.model') || 'gpt-4',
      tags: dto.tags,
      patientId: dto.patientId,
      vitalReadingId: dto.vitalReadingId,
      alertId: dto.alertId,
      containsPHI: dto.containsPHI || false,
      hipaaCompliant: true,
      settings: {
        temperature: dto.temperature || 0.7,
        maxTokens: dto.maxTokens || 1000,
        streamingEnabled: dto.streamingEnabled !== false,
        contextWindowSize: 20,
      },
    });

    return await this.conversationRepository.save(conversation);
  }

  /**
   * Get conversation by ID with message history
   */
  async getConversation(
    conversationId: string,
    userId: string,
    includeMessages: boolean = true,
  ): Promise<AIConversation> {
    const query = this.conversationRepository.createQueryBuilder('conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('conversation.userId = :userId', { userId })
      .andWhere('conversation.deletedAt IS NULL');

    if (includeMessages) {
      query
        .leftJoinAndSelect('conversation.messages', 'message')
        .orderBy('message.createdAt', 'ASC');
    }

    const conversation = await query.getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * List user's conversations with filtering
   */
  async listConversations(
    userId: string,
    dto: ListConversationsDto,
  ): Promise<{ conversations: AIConversation[]; total: number; page: number; limit: number }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.conversationRepository.createQueryBuilder('conversation')
      .where('conversation.userId = :userId', { userId })
      .andWhere('conversation.deletedAt IS NULL');

    // Apply filters
    if (dto.type) {
      query.andWhere('conversation.type = :type', { type: dto.type });
    }

    if (dto.archived !== undefined) {
      query.andWhere('conversation.archived = :archived', { archived: dto.archived });
    }

    if (dto.pinned !== undefined) {
      query.andWhere('conversation.pinned = :pinned', { pinned: dto.pinned });
    }

    if (dto.search) {
      query.andWhere(
        '(conversation.title ILIKE :search OR conversation.context ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.tag) {
      query.andWhere(':tag = ANY(conversation.tags)', { tag: dto.tag });
    }

    // Order by pinned first, then by last message time
    query
      .orderBy('conversation.pinned', 'DESC')
      .addOrderBy('conversation.lastMessageAt', 'DESC')
      .addOrderBy('conversation.createdAt', 'DESC');

    const [conversations, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      conversations,
      total,
      page,
      limit,
    };
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    dto: UpdateConversationDto,
  ): Promise<AIConversation> {
    const conversation = await this.getConversation(conversationId, userId, false);

    Object.assign(conversation, dto);

    return await this.conversationRepository.save(conversation);
  }

  /**
   * Delete conversation (soft delete)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId, false);
    conversation.deletedAt = new Date();
    await this.conversationRepository.save(conversation);
  }

  /**
   * Add message to conversation and get AI response
   */
  async addMessage(
    conversationId: string,
    userId: string,
    dto: AddMessageDto,
  ): Promise<{ userMessage: AIMessage; assistantMessage: AIMessage }> {
    const conversation = await this.getConversation(conversationId, userId, true);

    // Content safety check
    await this.checkContentSafety(dto.content);

    // Create user message
    const userMessage = this.messageRepository.create({
      conversationId,
      role: AIMessageRole.USER,
      content: dto.content,
      status: AIMessageStatus.COMPLETED,
      createdAt: new Date(),
    });

    const savedUserMessage = await this.messageRepository.save(userMessage);

    // Get conversation context
    const contextMessages = this.getContextMessages(
      conversation.messages,
      conversation.settings?.contextWindowSize || 20,
    );

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: conversation.systemPrompt },
      ...contextMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: dto.content },
    ];

    // Create assistant message (pending)
    const assistantMessage = this.messageRepository.create({
      conversationId,
      role: AIMessageRole.ASSISTANT,
      content: '',
      status: AIMessageStatus.PENDING,
      streamStartedAt: new Date(),
    });

    const savedAssistantMessage = await this.messageRepository.save(assistantMessage);

    try {
      // Get AI response
      const client = this.openai || this.grokClient;
      if (!client) {
        throw new Error('No AI client configured');
      }

      const response = await client.chat.completions.create({
        model: conversation.model,
        messages: messages as any,
        temperature: dto.temperature || conversation.settings?.temperature || 0.7,
        max_tokens: dto.maxTokens || conversation.settings?.maxTokens || 1000,
      });

      const completion = response.choices[0]?.message?.content || 'Unable to generate response';

      // Calculate tokens and cost
      const usage: TokenUsage = this.calculateTokensAndCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        conversation.model,
      );

      // Update assistant message
      assistantMessage.content = completion;
      assistantMessage.status = AIMessageStatus.COMPLETED;
      assistantMessage.streamCompletedAt = new Date();
      assistantMessage.promptTokens = usage.promptTokens;
      assistantMessage.completionTokens = usage.completionTokens;
      assistantMessage.totalTokens = usage.totalTokens;
      assistantMessage.cost = usage.cost;
      assistantMessage.model = conversation.model;
      assistantMessage.metadata = {
        finishReason: response.choices[0]?.finish_reason,
      };

      await this.messageRepository.save(assistantMessage);

      // Update conversation
      conversation.incrementMessageCount();
      conversation.incrementMessageCount(); // For both user and assistant messages
      conversation.addToTotalTokens(usage.totalTokens);
      conversation.addToTotalCost(usage.cost);
      conversation.lastMessageId = assistantMessage.id;
      conversation.lastMessagePreview = completion.substring(0, 200);
      conversation.lastMessageAt = new Date();

      await this.conversationRepository.save(conversation);

      // Check if summarization is needed
      if (conversation.shouldSummarize()) {
        await this.summarizeConversation(conversationId, userId);
      }

      return {
        userMessage: savedUserMessage,
        assistantMessage,
      };
    } catch (error) {
      // Update assistant message with error
      assistantMessage.status = AIMessageStatus.FAILED;
      assistantMessage.error = error.message;
      assistantMessage.errorCode = error.code;
      await this.messageRepository.save(assistantMessage);

      throw error;
    }
  }

  /**
   * Summarize conversation for long contexts
   */
  async summarizeConversation(
    conversationId: string,
    userId: string,
  ): Promise<string> {
    const conversation = await this.getConversation(conversationId, userId, true);

    const messagesContent = conversation.messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const prompt = `
      Summarize the following AI conversation in 2-3 paragraphs.
      Focus on the main topics discussed, key insights, and important outcomes.

      Conversation:
      ${messagesContent}

      Provide a concise summary:
    `;

    try {
      const client = this.openai || this.grokClient;
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use cheaper model for summarization
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 500,
      });

      const summary = response.choices[0]?.message?.content || '';

      conversation.summary = summary;
      conversation.summarizedAt = new Date();
      await this.conversationRepository.save(conversation);

      return summary;
    } catch (error) {
      this.logger.error('Failed to summarize conversation', error);
      return '';
    }
  }

  /**
   * Export conversation
   */
  async exportConversation(
    conversationId: string,
    userId: string,
    format: 'text' | 'json' | 'pdf' = 'text',
  ): Promise<string> {
    const conversation = await this.getConversation(conversationId, userId, true);

    if (format === 'json') {
      return JSON.stringify(conversation, null, 2);
    }

    if (format === 'text') {
      let text = `Conversation: ${conversation.title}\n`;
      text += `Created: ${conversation.createdAt}\n`;
      text += `Type: ${conversation.type}\n`;
      text += `Messages: ${conversation.messageCount}\n`;
      text += `Total Tokens: ${conversation.totalTokens}\n`;
      text += `Total Cost: $${conversation.totalCost}\n`;
      text += `\n${'='.repeat(80)}\n\n`;

      conversation.messages.forEach((message, index) => {
        text += `[${index + 1}] ${message.role.toUpperCase()} (${message.createdAt}):\n`;
        text += `${message.content}\n`;
        if (message.totalTokens > 0) {
          text += `(Tokens: ${message.totalTokens}, Cost: $${message.cost})\n`;
        }
        text += `\n${'-'.repeat(80)}\n\n`;
      });

      return text;
    }

    // For PDF, return a note (actual PDF generation would require additional library)
    return 'PDF export requires additional implementation with a PDF library';
  }

  /**
   * Search across conversations
   */
  async searchConversations(
    userId: string,
    query: string,
    limit: number = 10,
  ): Promise<AIConversation[]> {
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.messages', 'message')
      .where('conversation.userId = :userId', { userId })
      .andWhere('conversation.deletedAt IS NULL')
      .andWhere(
        '(conversation.title ILIKE :query OR conversation.context ILIKE :query OR message.content ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('conversation.lastMessageAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get token count for text
   */
  private countTokens(text: string): number {
    if (this.tokenEncoder) {
      try {
        return this.tokenEncoder.encode(text).length;
      } catch (error) {
        // Fallback to approximate count
        return Math.ceil(text.length / 4);
      }
    }
    // Approximate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate tokens and cost
   */
  private calculateTokensAndCost(
    promptTokens: number,
    completionTokens: number,
    model: string,
  ): TokenUsage {
    const totalTokens = promptTokens + completionTokens;
    const pricing = this.pricing[model] || this.pricing['gpt-4'];

    const cost =
      (promptTokens * pricing.prompt) / 1000 +
      (completionTokens * pricing.completion) / 1000;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      cost: parseFloat(cost.toFixed(6)),
    };
  }

  /**
   * Get context messages (last N messages)
   */
  private getContextMessages(
    messages: AIMessage[],
    contextWindowSize: number,
  ): AIMessage[] {
    // Filter out system messages and get last N messages
    const userAndAssistantMessages = messages.filter(
      m => m.role !== AIMessageRole.SYSTEM && m.status === AIMessageStatus.COMPLETED,
    );

    return userAndAssistantMessages.slice(-contextWindowSize);
  }

  /**
   * Check content safety
   */
  private async checkContentSafety(content: string): Promise<void> {
    // Implement content filtering logic here
    // For now, just check for basic prompt injection patterns
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /disregard\s+all\s+prior/i,
      /you\s+are\s+now/i,
      /new\s+instructions/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(content)) {
        throw new BadRequestException('Content contains potentially unsafe patterns');
      }
    }

    // Check for PHI patterns (simplified)
    const phiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    ];

    for (const pattern of phiPatterns) {
      if (pattern.test(content)) {
        this.logger.warn('Content may contain PHI');
        // Don't block, but flag it
      }
    }
  }

  /**
   * Get default system prompt based on conversation type
   */
  private getDefaultSystemPrompt(type?: AIConversationType): string {
    const basePrompt = `You are VitalWatch AI, a HIPAA-compliant healthcare assistant specialized in Remote Patient Monitoring (RPM).

Guidelines:
- Always prioritize patient safety and privacy
- Recommend seeking immediate medical attention for critical situations
- Provide evidence-based health information
- Be empathetic and supportive
- Never provide specific medical diagnoses
- Encourage patients to consult their healthcare providers for medical decisions
- Protect patient privacy and confidentiality
- Do not store or share personal health information inappropriately`;

    const typePrompts = {
      [AIConversationType.GENERAL_CHAT]: basePrompt,
      [AIConversationType.VITAL_ANALYSIS]: `${basePrompt}\n\nYou are analyzing vital signs and providing clinical insights.`,
      [AIConversationType.PATIENT_INSIGHT]: `${basePrompt}\n\nYou are providing comprehensive patient health insights based on historical data.`,
      [AIConversationType.HEALTH_SUMMARY]: `${basePrompt}\n\nYou are generating health summaries for patient reports.`,
      [AIConversationType.ALERT_RECOMMENDATION]: `${basePrompt}\n\nYou are helping providers respond to patient alerts with actionable recommendations.`,
      [AIConversationType.CLINICAL_DECISION]: `${basePrompt}\n\nYou are assisting with clinical decision support. Always recommend provider review.`,
    };

    return typePrompts[type] || basePrompt;
  }
}
