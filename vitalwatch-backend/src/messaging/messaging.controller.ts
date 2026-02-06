import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

// These guards should be imported from your auth module
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// For now, we'll create a placeholder
const JwtAuthGuard = ThrottlerGuard;

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messaging')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: Conversation,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConversation(
    @Body() createDto: CreateConversationDto,
    @Request() req: any,
  ): Promise<Conversation> {
    const userId = req.user?.id || req.user?.userId;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.messagingService.createConversation(createDto, userId, metadata);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiQuery({
    name: 'archived',
    required: false,
    type: Boolean,
    description: 'Include archived conversations',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
    type: [Conversation],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserConversations(
    @Request() req: any,
    @Query('archived') archived?: string,
  ): Promise<Conversation[]> {
    const userId = req.user?.id || req.user?.userId;
    const isArchived = archived === 'true';
    return this.messagingService.getUserConversations(userId, isArchived);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a specific conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
    type: Conversation,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getConversation(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<Conversation> {
    const userId = req.user?.id || req.user?.userId;
    return this.messagingService.getConversation(id, userId);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: Message,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendDto: SendMessageDto,
    @Request() req: any,
  ): Promise<Message> {
    const userId = req.user?.id || req.user?.userId;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.messagingService.sendMessage(
      conversationId,
      sendDto,
      userId,
      metadata,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMessages(
    @Param('id') conversationId: string,
    @Query() query: QueryMessagesDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id || req.user?.userId;
    return this.messagingService.getMessages(conversationId, userId, query);
  }

  @Patch('messages/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 204, description: 'Message marked as read' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async markMessageAsRead(
    @Param('id') messageId: string,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.userId;
    await this.messagingService.markMessageAsRead(messageId, userId);
  }

  @Get('conversations/unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const userId = req.user?.id || req.user?.userId;
    const count = await this.messagingService.getUnreadCount(userId);
    return { count };
  }

  @Get('messages/search')
  @ApiOperation({ summary: 'Search messages across all conversations' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Result limit' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchMessages(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ): Promise<any[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.messagingService.searchMessages(
      userId,
      query,
      limit ? parseInt(limit.toString(), 10) : 50,
    );
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own messages' })
  async deleteMessage(
    @Param('id') messageId: string,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.userId;
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    await this.messagingService.deleteMessage(messageId, userId, metadata);
  }

  @Post('conversations/:id/typing')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set typing indicator' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 204, description: 'Typing indicator updated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async setTypingIndicator(
    @Param('id') conversationId: string,
    @Body('isTyping') isTyping: boolean,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.userId;
    await this.messagingService.setTypingIndicator(conversationId, userId, isTyping);
  }
}
