import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { AIEnhancedService } from './ai-enhanced.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIEnhancedController {
  constructor(
    private readonly aiService: AIService,
    private readonly aiEnhancedService: AIEnhancedService,
  ) {}

  // ==================== Legacy Endpoints (maintained for backward compatibility) ====================

  @Post('chat')
  async chat(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ) {
    const response = await this.aiService.chatWithAI(body.messages);
    return { response };
  }

  @Post('analyze-vitals')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async analyzeVitals(@Body() body: { vitals: any[] }) {
    const analyses = await Promise.all(
      body.vitals.map(vital => this.aiService.analyzeVitalReading(vital)),
    );
    return { analyses };
  }

  @Post('patient-insight')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientInsight(
    @Body() body: { patientId: string; vitals: any[]; alerts: any[] },
  ) {
    const insight = await this.aiService.analyzePatientHistory(
      body.patientId,
      body.vitals,
      body.alerts,
    );
    return insight;
  }

  @Post('health-summary')
  async getHealthSummary(
    @Body() body: { vitals: any[]; alerts: any[] },
  ) {
    const summary = await this.aiService.generateHealthSummary(
      body.vitals,
      body.alerts,
    );
    return { summary };
  }

  // ==================== New Conversation Management Endpoints ====================

  /**
   * Create a new AI conversation
   * POST /ai/conversations
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateConversationDto,
  ) {
    const conversation = await this.aiEnhancedService.createConversation(user.userId, dto);
    return {
      success: true,
      data: conversation,
    };
  }

  /**
   * List user's conversations with filtering and pagination
   * GET /ai/conversations
   */
  @Get('conversations')
  async listConversations(
    @CurrentUser() user: CurrentUserPayload,
    @Query() dto: ListConversationsDto,
  ) {
    const result = await this.aiEnhancedService.listConversations(user.userId, dto);
    return {
      success: true,
      data: result.conversations,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get conversation by ID with message history
   * GET /ai/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
  ) {
    const conversation = await this.aiEnhancedService.getConversation(
      conversationId,
      user.userId,
      true,
    );
    return {
      success: true,
      data: conversation,
    };
  }

  /**
   * Update conversation
   * PATCH /ai/conversations/:id
   */
  @Patch('conversations/:id')
  async updateConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const conversation = await this.aiEnhancedService.updateConversation(
      conversationId,
      user.userId,
      dto,
    );
    return {
      success: true,
      data: conversation,
    };
  }

  /**
   * Delete conversation (soft delete)
   * DELETE /ai/conversations/:id
   */
  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
  ) {
    await this.aiEnhancedService.deleteConversation(conversationId, user.userId);
  }

  /**
   * Add message to conversation and get AI response
   * POST /ai/conversations/:id/messages
   */
  @Post('conversations/:id/messages')
  async addMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() dto: AddMessageDto,
  ) {
    const result = await this.aiEnhancedService.addMessage(
      conversationId,
      user.userId,
      dto,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get conversation summary
   * GET /ai/conversations/:id/summary
   */
  @Get('conversations/:id/summary')
  async getConversationSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
  ) {
    const summary = await this.aiEnhancedService.summarizeConversation(
      conversationId,
      user.userId,
    );
    return {
      success: true,
      data: { summary },
    };
  }

  /**
   * Export conversation
   * GET /ai/conversations/:id/export
   */
  @Get('conversations/:id/export')
  async exportConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Query('format') format: 'text' | 'json' | 'pdf' = 'text',
  ) {
    const exported = await this.aiEnhancedService.exportConversation(
      conversationId,
      user.userId,
      format,
    );

    return {
      success: true,
      data: {
        format,
        content: exported,
      },
    };
  }

  /**
   * Search across conversations
   * GET /ai/conversations/search
   */
  @Get('conversations/search')
  async searchConversations(
    @CurrentUser() user: CurrentUserPayload,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const conversations = await this.aiEnhancedService.searchConversations(
      user.userId,
      query,
      limit,
    );
    return {
      success: true,
      data: conversations,
    };
  }

  /**
   * Get conversation statistics
   * GET /ai/conversations/stats
   */
  @Get('conversations/stats')
  async getConversationStats(@CurrentUser() user: CurrentUserPayload) {
    const conversations = await this.aiEnhancedService.listConversations(user.userId, {
      page: 1,
      limit: 1000,
    });

    const stats = {
      totalConversations: conversations.total,
      totalMessages: conversations.conversations.reduce((sum, c) => sum + c.messageCount, 0),
      totalTokens: conversations.conversations.reduce((sum, c) => sum + c.totalTokens, 0),
      totalCost: conversations.conversations.reduce(
        (sum, c) => sum + parseFloat(c.totalCost.toString()),
        0,
      ),
      byType: {} as Record<string, number>,
      averageMessagesPerConversation: 0,
    };

    conversations.conversations.forEach(c => {
      stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
    });

    stats.averageMessagesPerConversation =
      stats.totalConversations > 0
        ? Math.round(stats.totalMessages / stats.totalConversations)
        : 0;

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Share conversation with provider
   * POST /ai/conversations/:id/share
   */
  @Post('conversations/:id/share')
  @Roles(UserRole.PATIENT)
  async shareConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() body: { providerId?: string; userIds?: string[] },
  ) {
    const updateDto: UpdateConversationDto = {};

    if (body.providerId) {
      updateDto.sharedWithProvider = true;
    }

    if (body.userIds) {
      updateDto.sharedWithUserIds = body.userIds;
    }

    const conversation = await this.aiEnhancedService.updateConversation(
      conversationId,
      user.userId,
      updateDto,
    );

    return {
      success: true,
      data: conversation,
      message: 'Conversation shared successfully',
    };
  }

  /**
   * Get shared conversations (for providers)
   * GET /ai/conversations/shared
   */
  @Get('conversations/shared')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getSharedConversations(
    @CurrentUser() user: CurrentUserPayload,
    @Query() dto: ListConversationsDto,
  ) {
    // This would need additional implementation to query conversations shared with this provider
    // For now, return empty array
    return {
      success: true,
      data: [],
      meta: {
        total: 0,
        page: dto.page || 1,
        limit: dto.limit || 20,
        totalPages: 0,
      },
    };
  }

  /**
   * Pin/Unpin conversation
   * POST /ai/conversations/:id/pin
   */
  @Post('conversations/:id/pin')
  async pinConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() body: { pinned: boolean },
  ) {
    const conversation = await this.aiEnhancedService.updateConversation(
      conversationId,
      user.userId,
      { pinned: body.pinned },
    );

    return {
      success: true,
      data: conversation,
      message: body.pinned ? 'Conversation pinned' : 'Conversation unpinned',
    };
  }

  /**
   * Archive/Unarchive conversation
   * POST /ai/conversations/:id/archive
   */
  @Post('conversations/:id/archive')
  async archiveConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() body: { archived: boolean },
  ) {
    const conversation = await this.aiEnhancedService.updateConversation(
      conversationId,
      user.userId,
      { archived: body.archived },
    );

    return {
      success: true,
      data: conversation,
      message: body.archived ? 'Conversation archived' : 'Conversation unarchived',
    };
  }

  /**
   * Add tags to conversation
   * POST /ai/conversations/:id/tags
   */
  @Post('conversations/:id/tags')
  async addTags(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') conversationId: string,
    @Body() body: { tags: string[] },
  ) {
    const conversation = await this.aiEnhancedService.getConversation(
      conversationId,
      user.userId,
      false,
    );

    const existingTags = conversation.tags || [];
    const newTags = [...new Set([...existingTags, ...body.tags])];

    const updated = await this.aiEnhancedService.updateConversation(
      conversationId,
      user.userId,
      { tags: newTags },
    );

    return {
      success: true,
      data: updated,
      message: 'Tags added successfully',
    };
  }

  /**
   * Get all unique tags
   * GET /ai/tags
   */
  @Get('tags')
  async getAllTags(@CurrentUser() user: CurrentUserPayload) {
    const conversations = await this.aiEnhancedService.listConversations(user.userId, {
      page: 1,
      limit: 1000,
    });

    const allTags = new Set<string>();
    conversations.conversations.forEach(c => {
      if (c.tags) {
        c.tags.forEach(tag => allTags.add(tag));
      }
    });

    return {
      success: true,
      data: Array.from(allTags).sort(),
    };
  }
}
