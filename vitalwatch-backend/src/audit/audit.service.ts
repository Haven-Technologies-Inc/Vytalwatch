import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface LogOptions {
  action: AuditAction | string;
  userId?: string;
  resource?: string;
  resourceType?: string; // Alias for resource (backward compatibility)
  resourceId?: string;
  metadata?: Record<string, any>;
  details?: Record<string, any>; // Alias for metadata (backward compatibility)
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
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
      resource: options.resource || options.resourceType || 'system', // Default to 'system' if not provided
      resourceId: options.resourceId,
      metadata: options.metadata || options.details, // Support both names
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });

    return this.auditRepository.save(auditLog);
  }

  async findAll(options: AuditQueryOptions): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const queryBuilder = this.auditRepository.createQueryBuilder('audit');

    if (userId) queryBuilder.andWhere('audit.userId = :userId', { userId });
    if (action) queryBuilder.andWhere('audit.action = :action', { action });
    if (resource) queryBuilder.andWhere('audit.resource = :resource', { resource });
    if (resourceId) queryBuilder.andWhere('audit.resourceId = :resourceId', { resourceId });
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

  async findByResource(resource: string, resourceId: string, options?: { page?: number; limit?: number }): Promise<{ logs: AuditLog[]; total: number }> {
    return this.findAll({ resource, resourceId, ...options });
  }

  async getRecentActivity(userId: string, limit: number = 20): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
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

  async getSecurityEvents(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.PASSWORD_CHANGED,
      AuditAction.PASSWORD_RESET_REQUESTED,
      AuditAction.PASSWORD_RESET_COMPLETED,
      AuditAction.USER_DEACTIVATED,
    ];

    return this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.action IN (:...actions)', { actions: securityActions })
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
