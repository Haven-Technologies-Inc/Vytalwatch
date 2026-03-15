import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(options: { page: number; limit: number; search?: string; status?: string }) {
    const { page, limit, search, status } = options;
    const skip = (page - 1) * limit;

    const query = this.organizationRepository.createQueryBuilder('org');

    if (status) {
      query.andWhere('org.status = :status', { status });
    }

    if (search) {
      query.andWhere('(org.name ILIKE :search OR org.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    try {
      const [organizations, total] = await query
        .orderBy('org.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        data: organizations,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (user.role !== String(UserRole.SUPERADMIN) && user.organizationId !== id) {
      throw new ForbiddenException('Access denied');
    }

    return organization;
  }

  async create(dto: Record<string, any>, user: CurrentUserPayload) {
    const organization = new Organization();
    Object.assign(organization, dto);
    const saved = await this.organizationRepository.save(organization);

    await this.auditService.log({
      action: 'ORGANIZATION_CREATED',
      userId: user.sub,
      details: { organizationId: saved.id, name: saved.name },
    });

    return saved;
  }

  async update(id: string, dto: Record<string, any>, user: CurrentUserPayload) {
    await this.findOne(id, user);
    await this.organizationRepository.update(id, dto);

    await this.auditService.log({
      action: 'ORGANIZATION_UPDATED',
      userId: user.sub,
      details: { organizationId: id, changes: Object.keys(dto) },
    });

    return this.organizationRepository.findOne({ where: { id } });
  }

  async remove(id: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    await this.organizationRepository.delete(id);
  }

  async getUsers(id: string, role?: string) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.status',
        'user.organizationId',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.organizationId = :id', { id });

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    return query.getMany();
  }

  async addUser(orgId: string, userId: string, user: CurrentUserPayload) {
    await this.userRepository.update(userId, { organizationId: orgId });

    await this.auditService.log({
      action: 'USER_ADDED_TO_ORGANIZATION',
      userId: user.sub,
      details: { organizationId: orgId, targetUserId: userId },
    });

    return { success: true };
  }

  async removeUser(orgId: string, userId: string, user: CurrentUserPayload) {
    await this.userRepository.update(userId, { organizationId: undefined });

    await this.auditService.log({
      action: 'USER_REMOVED_FROM_ORGANIZATION',
      userId: user.sub,
      details: { organizationId: orgId, targetUserId: userId },
    });
  }

  async getPatients(id: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [patients, total] = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.status',
        'user.organizationId',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.organizationId = :id', { id })
      .andWhere('user.role = :role', { role: UserRole.PATIENT })
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: patients,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDevices(id: string) {
    try {
      return await this.deviceRepository.find({ where: { organizationId: id } });
    } catch {
      return [];
    }
  }

  async getBilling(id: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const orgWithRelations = organization as Organization & {
      subscription?: unknown;
      billingRecords?: unknown[];
    };

    return {
      subscription: orgWithRelations.subscription,
      billingRecords: orgWithRelations.billingRecords || [],
      usage: await this.calculateUsage(id),
    };
  }

  async getAnalytics(id: string, options: { startDate?: string; endDate?: string }) {
    const patientCount = await this.userRepository.count({
      where: { organizationId: id, role: UserRole.PATIENT },
    });

    const providerCount = await this.userRepository.count({
      where: { organizationId: id, role: UserRole.PROVIDER },
    });

    let deviceCount = 0;
    try {
      deviceCount = await this.deviceRepository.count({
        where: { organizationId: id },
      });
    } catch {
      /* devices table may not exist */
    }

    return {
      patientCount,
      providerCount,
      deviceCount,
      period: options,
    };
  }

  async getSettings(id: string, user: CurrentUserPayload): Promise<Record<string, unknown>> {
    await this.findOne(id, user);
    return {};
  }

  async updateSettings(id: string, settings: Record<string, unknown>, user: CurrentUserPayload) {
    await this.auditService.log({
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      userId: user.sub,
      details: { organizationId: id },
    });

    return this.getSettings(id, user);
  }

  private async calculateUsage(id: string) {
    const patientCount = await this.userRepository.count({
      where: { organizationId: id, role: UserRole.PATIENT },
    });

    return {
      patients: patientCount,
      apiCalls: 0, // Would track from API logs
      storage: 0, // Would calculate from stored data
    };
  }
}
