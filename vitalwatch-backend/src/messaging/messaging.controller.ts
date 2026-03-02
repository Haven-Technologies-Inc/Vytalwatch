import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import { CreateThreadDto, SendMessageDto } from './dto/messaging.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('threads')
  async getThreads(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.getThreads(user.sub, { page, limit });
  }

  @Get('threads/:id')
  async getThread(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.getThread(id, user.sub);
  }

  @Post('threads')
  async createThread(@Body() dto: CreateThreadDto, @CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.createThread(dto, user.sub);
  }

  @Get('threads/:id/messages')
  async getMessages(
    @Param('id') threadId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.getMessages(threadId, user.sub, { page, limit });
  }

  @Post('threads/:id/messages')
  async sendMessage(
    @Param('id') threadId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.sendMessage(threadId, dto, user.sub);
  }

  @Put('threads/:id/read')
  @HttpCode(HttpStatus.OK)
  async markThreadAsRead(@Param('id') threadId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.messagingService.markThreadAsRead(threadId, user.sub);
    return { success: true };
  }

  @Put('messages/:id/read')
  @HttpCode(HttpStatus.OK)
  async markMessageAsRead(@Param('id') messageId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.messagingService.markMessageAsRead(messageId, user.sub);
    return { success: true };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.getUnreadCount(user.sub);
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(@Param('id') threadId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.messagingService.deleteThread(threadId, user.sub);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('id') messageId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.messagingService.deleteMessage(messageId, user.sub);
  }
}
