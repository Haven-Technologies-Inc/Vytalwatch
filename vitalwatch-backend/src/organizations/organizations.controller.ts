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
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { UserRole } from '../users/entities/user.entity';

class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  address?: any;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  subscriptionPlan?: string;
}

class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  address?: any;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.organizationsService.findAll({ page, limit, search, status });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.organizationsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.organizationsService.remove(id);
  }

  @Get(':id/users')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getUsers(@Param('id') id: string, @Query('role') role?: string) {
    return this.organizationsService.getUsers(id, role);
  }

  @Post(':id/users/:userId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async addUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.organizationsService.addUser(id, userId, user);
  }

  @Delete(':id/users/:userId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.organizationsService.removeUser(id, userId, user);
  }

  @Get(':id/patients')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async getPatients(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.organizationsService.getPatients(id, { page, limit });
  }

  @Get(':id/devices')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async getDevices(@Param('id') id: string) {
    return this.organizationsService.getDevices(id);
  }

  @Get(':id/billing')
  @Roles(UserRole.ADMIN)
  async getBilling(@Param('id') id: string) {
    return this.organizationsService.getBilling(id);
  }

  @Get(':id/analytics')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async getAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.organizationsService.getAnalytics(id, { startDate, endDate });
  }

  @Get(':id/settings')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getSettings(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.getSettings(id, user);
  }

  @Put(':id/settings')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: Record<string, any>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.organizationsService.updateSettings(id, settings, user);
  }
}
