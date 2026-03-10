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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { UserRole } from '../users/entities/user.entity';
import { EnterpriseLoggingService } from '../enterprise-logging/enterprise-logging.service';

class CreateApiKeyDto {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
  rateLimit?: number;
}

class UpdateSystemSettingsDto {
  key: string;
  value: any;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly enterpriseLoggingService: EnterpriseLoggingService,
  ) {}

  // API Keys Management
  @Get('api-keys')
  async getApiKeys(@CurrentUser() user: CurrentUserPayload) {
    return this.adminService.getApiKeys(user);
  }

  @Get('api-keys/:id')
  async getApiKey(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.adminService.getApiKey(id, user);
  }

  @Post('api-keys')
  async createApiKey(@Body() dto: CreateApiKeyDto, @CurrentUser() user: CurrentUserPayload) {
    return this.adminService.createApiKey(dto, user);
  }

  @Put('api-keys/:id')
  async updateApiKey(
    @Param('id') id: string,
    @Body() dto: Partial<CreateApiKeyDto>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.updateApiKey(id, dto, user);
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApiKey(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.adminService.deleteApiKey(id, user);
  }

  @Post('api-keys/:id/regenerate')
  async regenerateApiKey(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.adminService.regenerateApiKey(id, user);
  }

  // System Logs
  @Get('logs')
  async getLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('level') level?: string,
    @Query('source') source?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getLogs({ page, limit, level, source, startDate, endDate });
  }

  @Get('logs/:id')
  async getLogEntry(@Param('id') id: string) {
    return this.adminService.getLogEntry(id);
  }

  @Get('logs/stats')
  async getLogStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getLogStats({ startDate, endDate });
  }

  // System Settings
  @Get('settings')
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Get('settings/:key')
  async getSystemSetting(@Param('key') key: string) {
    return this.adminService.getSystemSetting(key);
  }

  @Put('settings')
  async updateSystemSettings(
    @Body() dto: UpdateSystemSettingsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.updateSystemSetting(dto, user);
  }

  @Put('settings/bulk')
  async updateSystemSettingsBulk(
    @Body() settings: Record<string, any>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.updateSystemSettingsBulk(settings, user);
  }

  // Usage Statistics
  @Get('usage')
  async getUsageStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getUsageStats({ startDate, endDate });
  }

  @Get('usage/api')
  async getApiUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.adminService.getApiUsage({ startDate, endDate, groupBy });
  }

  @Get('usage/storage')
  async getStorageUsage() {
    return this.adminService.getStorageUsage();
  }

  // System Health
  @Get('health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('health/database')
  async getDatabaseHealth() {
    return this.adminService.getDatabaseHealth();
  }

  @Get('health/services')
  async getServicesHealth() {
    return this.adminService.getServicesHealth();
  }

  // User Management (Admin-specific)
  @Get('users/pending')
  async getPendingUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getPendingUsers({ page, limit });
  }

  @Post('users/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveUser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.adminService.approveUser(id, user);
  }

  @Post('users/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectUser(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.rejectUser(id, dto.reason, user);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.suspendUser(id, dto.reason, user);
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.adminService.reactivateUser(id, user);
  }

  // Maintenance
  @Post('maintenance/enable')
  @HttpCode(HttpStatus.OK)
  async enableMaintenanceMode(
    @Body() dto: { message?: string; estimatedDuration?: number },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.enableMaintenanceMode(dto, user);
  }

  @Post('maintenance/disable')
  @HttpCode(HttpStatus.OK)
  async disableMaintenanceMode(@CurrentUser() user: CurrentUserPayload) {
    return this.adminService.disableMaintenanceMode(user);
  }

  @Get('maintenance/status')
  async getMaintenanceStatus() {
    return this.adminService.getMaintenanceStatus();
  }

  // Cache Management
  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  async clearCache(
    @Body() dto: { pattern?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.clearCache(dto.pattern, user);
  }

  @Get('cache/stats')
  async getCacheStats() {
    return this.adminService.getCacheStats();
  }

  @Get('api-logs')
  async getApiLogs(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    return this.enterpriseLoggingService.query({
      page: page || 1,
      limit: limit || 50,
    });
  }

  // Security
  @Get('security/blocked-ips')
  getBlockedIps() {
    return { blockedIps: [], total: 0 };
  }

  @Post('security/block-ip')
  @HttpCode(HttpStatus.OK)
  blockIp(@Body() dto: { ip: string; reason?: string }) {
    return { success: true, ip: dto.ip, blockedAt: new Date().toISOString() };
  }

  @Post('security/unblock-ip')
  @HttpCode(HttpStatus.OK)
  unblockIp(@Body() dto: { ip: string }) {
    return { success: true, ip: dto.ip };
  }
}
