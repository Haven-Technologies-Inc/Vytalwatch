import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';

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
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
      relations: ['organization'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
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
      resetToken: null,
      resetTokenExpiresAt: null,
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { verificationToken: token },
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      verificationToken: null,
      status: UserStatus.ACTIVE,
    });
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
    return this.userRepository.find({
      where: {
        assignedProviderId: providerId,
        role: UserRole.PATIENT,
      },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async assignPatientToProvider(patientId: string, providerId: string): Promise<User> {
    const patient = await this.findById(patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient not found');
    }

    patient.assignedProviderId = providerId;
    return this.userRepository.save(patient);
  }

  private generateToken(): string {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
  }
}
