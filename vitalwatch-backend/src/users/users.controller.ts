import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsEmail, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { UsersService, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';
import { InviteCode } from '../auth/entities/invite-code.entity';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';

class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepository: Repository<InviteCode>,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async inviteUser(@Body() dto: InviteUserDto, @CurrentUser() user: CurrentUserPayload) {
    // Validate role
    const allowedRole = dto.role as UserRole;
    if (!Object.values(UserRole).includes(allowedRole)) {
      throw new BadRequestException(`Invalid role: ${dto.role}`);
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Generate invite code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const inviteCode = this.inviteCodeRepository.create({
      code,
      allowedRole,
      organizationId: dto.organizationId,
      createdById: user.sub,
      maxUses: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      description: `Invitation for ${dto.email}`,
    });

    const saved = await this.inviteCodeRepository.save(inviteCode);

    // Send invitation email
    try {
      const creator = await this.usersService.findById(user.sub);
      await this.emailService.sendInviteCode(dto.email, {
        code: saved.code,
        role: allowedRole,
        organizationName: 'VytalWatch Health',
        inviterName: creator ? `${creator.firstName} ${creator.lastName}` : 'VytalWatch Admin',
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send invite email to ${dto.email}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    await this.auditService.log({
      action: 'INVITE_SENT',
      userId: user.sub,
      details: { email: dto.email, role: allowedRole, inviteCodeId: saved.id },
    });

    return {
      inviteId: saved.id,
      code: saved.code,
      expiresAt: saved.expiresAt.toISOString(),
    };
  }

  @Get('me')
  async getCurrentUser(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Put('me')
  async updateCurrentUser(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  // Profile aliases (frontend uses /users/profile)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  // Change password
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  // MFA endpoints
  @Post('mfa/enable')
  async enableMfa(@Request() req: any) {
    return this.usersService.enableMfa(req.user.sub);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Request() req: any, @Body() dto: { code: string }) {
    return this.usersService.verifyMfa(req.user.sub, dto.code);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(@Request() req: any, @Body() dto: { code: string }) {
    return this.usersService.disableMfa(req.user.sub, dto.code);
  }

  // User settings
  @Get('settings')
  async getUserSettings(@Request() req: any) {
    return this.usersService.getUserSettings(req.user.sub);
  }

  @Put('settings')
  async updateUserSettings(@Request() req: any, @Body() settings: Record<string, any>) {
    return this.usersService.updateUserSettings(req.user.sub, settings);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('role') role?: UserRole,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ organizationId, role, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.delete(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Get('provider/:providerId/patients')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientsByProvider(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.usersService.getPatientsByProvider(providerId);
  }

  @Post('patients/:patientId/assign/:providerId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async assignPatientToProvider(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.usersService.assignPatientToProvider(patientId, providerId);
  }
}
