import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(user.sub, {
      page,
      limit,
      unreadOnly,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.markAllAsRead(user.sub);
    return { success: true };
  }
}
