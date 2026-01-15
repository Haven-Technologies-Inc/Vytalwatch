import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface LogOptions {
  action: AuditAction | string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
}

export interface AuditQueryOptions {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(options: LogOptions): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      action: options.action as AuditAction,
      userId: options.userId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      organizationId: options.organizationId,
    });

    return this.auditRepository.save(auditLog);
  }

  async findAll(options: AuditQueryOptions): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      organizationId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const where: FindOptionsWhere<AuditLog> = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (organizationId) where.organizationId = organizationId;

    const queryBuilder = this.auditRepository.createQueryBuilder('audit');

    if (userId) queryBuilder.andWhere('audit.userId = :userId', { userId });
    if (action) queryBuilder.andWhere('audit.action = :action', { action });
    if (resourceType) queryBuilder.andWhere('audit.resourceType = :resourceType', { resourceType });
    if (resourceId) queryBuilder.andWhere('audit.resourceId = :resourceId', { resourceId });
    if (organizationId) queryBuilder.andWhere('audit.organizationId = :organizationId', { organizationId });
    if (startDate && endDate) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total };
  }

  async findByUser(userId: string, options?: { page?: number; limit?: number }): Promise<{ logs: AuditLog[]; total: number }> {
    return this.findAll({ userId, ...options });
  }

  async findByResource(resourceType: string, resourceId: string, options?: { page?: number; limit?: number }): Promise<{ logs: AuditLog[]; total: number }> {
    return this.findAll({ resourceType, resourceId, ...options });
  }

  async getRecentActivity(organizationId: string, limit: number = 20): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async getLoginHistory(userId: string, limit: number = 10): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: {
        userId,
        action: AuditAction.LOGIN_SUCCESS,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSecurityEvents(organizationId: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.PASSWORD_CHANGED,
      AuditAction.PASSWORD_RESET_REQUESTED,
      AuditAction.PASSWORD_RESET_COMPLETED,
      AuditAction.USER_DEACTIVATED,
    ];

    return this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.action IN (:...actions)', { actions: securityActions })
      .andWhere('audit.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('audit.createdAt', 'DESC')
      .getMany();
  }

  async cleanup(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
