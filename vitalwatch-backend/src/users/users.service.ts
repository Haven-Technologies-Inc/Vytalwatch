import { Injectable, Logger, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';

export interface CreateUserDto {
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  organizationId?: string;
  avatar?: string;
  emailVerified?: boolean;
  googleId?: string;
  microsoftId?: string;
  appleId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
  role?: UserRole;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepository: Repository<PatientProfile>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const email = this.configService.get<string>('ADMIN_EMAIL', 'admin@vytalwatch.ai');
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return;
    }

    const password = this.configService.get<string>('ADMIN_PASSWORD', 'Admin123!@#');
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = this.userRepository.create({
      email,
      passwordHash,
      firstName: this.configService.get<string>('ADMIN_FIRST_NAME', 'Admin'),
      lastName: this.configService.get<string>('ADMIN_LAST_NAME', 'User'),
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    await this.userRepository.save(admin);
    this.logger.log(`Seeded admin user: ${email}`);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      verificationToken: this.generateToken(),
    });

    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByOAuthId(provider: 'google' | 'microsoft' | 'apple', providerId: string): Promise<User | null> {
    const where: FindOptionsWhere<User> = {};

    switch (provider) {
      case 'google':
        where.googleId = providerId;
        break;
      case 'microsoft':
        where.microsoftId = providerId;
        break;
      case 'apple':
        where.appleId = providerId;
        break;
    }

    return this.userRepository.findOne({ where });
  }

  async linkOAuthAccount(userId: string, provider: 'google' | 'microsoft' | 'apple', providerId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    switch (provider) {
      case 'google':
        user.googleId = providerId;
        break;
      case 'microsoft':
        user.microsoftId = providerId;
        break;
      case 'apple':
        user.appleId = providerId;
        break;
    }

    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updateLastLogin(id: string, ip?: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(id, { passwordHash });
  }

  async setResetToken(id: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    await this.userRepository.update(id, {
      resetToken: token,
      resetTokenExpiresAt: expiresAt,
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      return null;
    }

    return user;
  }

  async clearResetToken(id: string): Promise<void> {
    await this.userRepository.update(id, {
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
    } as any);
  }

  async setMagicLinkToken(id: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Token expires in 15 minutes

    await this.userRepository.update(id, {
      magicLinkToken: token,
      magicLinkTokenExpiresAt: expiresAt,
    } as any);
  }

  async findByMagicLinkToken(token: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { magicLinkToken: token } as any,
    });

    if (!user || !(user as any).magicLinkTokenExpiresAt || (user as any).magicLinkTokenExpiresAt < new Date()) {
      return null;
    }

    return user;
  }

  async clearMagicLinkToken(id: string): Promise<void> {
    await this.userRepository.update(id, {
      magicLinkToken: undefined,
      magicLinkTokenExpiresAt: undefined,
    } as any);
  }

  async setSmsVerificationCode(phone: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (user) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      await this.userRepository.update(user.id, {
        smsVerificationCode: code,
        smsVerificationExpiresAt: expiresAt,
      } as any);
    }
  }

  async verifySmsCode(phone: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (!user) return false;
    
    const userData = user as any;
    if (!userData.smsVerificationCode || !userData.smsVerificationExpiresAt) return false;
    if (userData.smsVerificationExpiresAt < new Date()) return false;
    
    return userData.smsVerificationCode === code;
  }

  async markPhoneVerified(phone: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (user) {
      await this.userRepository.update(user.id, {
        phoneVerified: true,
        smsVerificationCode: undefined,
        smsVerificationExpiresAt: undefined,
      } as any);
    }
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { verificationToken: token },
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      verificationToken: undefined,
      status: UserStatus.ACTIVE,
    } as any);
  }

  async findAll(options?: {
    organizationId?: string;
    role?: UserRole;
    status?: UserStatus;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number }> {
    const { organizationId, role, status, page = 1, limit = 20 } = options || {};

    const where: FindOptionsWhere<User> = {};
    if (organizationId) where.organizationId = organizationId;
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }

  async delete(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { status: UserStatus.INACTIVE });
  }

  async getPatientsByProvider(providerId: string): Promise<User[]> {
    const profiles = await this.patientProfileRepository.find({
      where: { assignedProviderId: providerId },
      select: ['patientId'],
    });

    if (profiles.length === 0) return [];

    const patientIds = profiles.map(p => p.patientId);
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: patientIds })
      .andWhere('user.role = :role', { role: UserRole.PATIENT })
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();
  }

  async assignPatientToProvider(patientId: string, providerId: string): Promise<User> {
    const patient = await this.findById(patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient not found');
    }

    let profile = await this.patientProfileRepository.findOne({ where: { patientId } });
    if (profile) {
      profile.assignedProviderId = providerId;
      await this.patientProfileRepository.save(profile);
    } else {
      profile = this.patientProfileRepository.create({ patientId, assignedProviderId: providerId });
      await this.patientProfileRepository.save(profile);
    }

    return patient;
  }

  async getPatientProfile(patientId: string): Promise<PatientProfile | null> {
    return this.patientProfileRepository.findOne({ where: { patientId } });
  }

  // ==================== PASSWORD ====================

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ConflictException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);
  }

  // ==================== MFA ====================

  async enableMfa(userId: string): Promise<{ qrCode: string; secret: string }> {
    const secret = this.generateToken();
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    // Store secret in user metadata (simplified - production would use speakeasy/otplib)
    await this.userRepository.update(userId, { mfaSecret: secret } as any);
    return {
      qrCode: `otpauth://totp/VytalWatch:${user.email}?secret=${secret}&issuer=VytalWatch`,
      secret,
    };
  }

  async verifyMfa(userId: string, code: string): Promise<{ verified: boolean }> {
    // Simplified MFA verification - production would use TOTP validation
    this.logger.log(`MFA verification for user ${userId}`);
    await this.userRepository.update(userId, { mfaEnabled: true } as any);
    return { verified: true };
  }

  async disableMfa(userId: string, code: string): Promise<{ disabled: boolean }> {
    await this.userRepository.update(userId, { mfaEnabled: false, mfaSecret: null } as any);
    return { disabled: true };
  }

  // ==================== USER SETTINGS ====================

  async getUserSettings(userId: string): Promise<Record<string, any>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return (user as any).settings || {
      notifications: { email: true, sms: false, push: true },
      alertSettings: {
        criticalAlerts: true, warningAlerts: true, infoAlerts: false,
        afterHoursAlerts: true, escalationDelay: '15',
        criticalThresholds: { systolicHigh: '180', systolicLow: '90', glucoseHigh: '300', glucoseLow: '50', spo2Low: '88' },
      },
      availability: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '09:00', end: '12:00' },
        sunday: { enabled: false, start: '', end: '' },
      },
    };
  }

  async updateUserSettings(userId: string, settings: Record<string, any>): Promise<Record<string, any>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update(userId, { settings } as any);
    return settings;
  }

  private generateToken(): string {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
  }
}
