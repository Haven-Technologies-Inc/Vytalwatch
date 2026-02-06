import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Task, TaskType, TaskStatus, TaskPriority } from './entities/task.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateTaskDto {
  type: TaskType;
  title: string;
  description?: string;
  patientId: string;
  assignedTo: string;
  createdBy: string;
  priority?: TaskPriority;
  dueDate?: Date;
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDate?: Date;
  completionNotes?: string;
}

export interface TaskQueryOptions {
  patientId?: string;
  assignedTo?: string;
  createdBy?: string;
  status?: TaskStatus | TaskStatus[];
  type?: TaskType;
  priority?: TaskPriority;
  dueBefore?: Date;
  dueAfter?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      status: TaskStatus.PENDING,
      priority: createTaskDto.priority || TaskPriority.MEDIUM,
    });

    const saved = await this.taskRepository.save(task);

    await this.auditService.log({
      action: 'TASK_CREATED',
      userId: createTaskDto.createdBy,
      resourceType: 'task',
      resourceId: saved.id,
      details: { type: createTaskDto.type, patientId: createTaskDto.patientId },
    });

    // Send notification to assignee
    await this.sendTaskNotification(saved, 'assigned');

    return saved;
  }

  async findById(id: string): Promise<Task | null> {
    return this.taskRepository.findOne({
      where: { id },
      relations: ['patient', 'assignee', 'creator'],
    });
  }

  async findAll(options: TaskQueryOptions): Promise<{ tasks: Task[]; total: number }> {
    const {
      patientId,
      assignedTo,
      createdBy,
      status,
      type,
      priority,
      dueBefore,
      dueAfter,
      page = 1,
      limit = 20,
    } = options;

    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (patientId) queryBuilder.andWhere('task.patientId = :patientId', { patientId });
    if (assignedTo) queryBuilder.andWhere('task.assignedTo = :assignedTo', { assignedTo });
    if (createdBy) queryBuilder.andWhere('task.createdBy = :createdBy', { createdBy });

    if (status) {
      if (Array.isArray(status)) {
        queryBuilder.andWhere('task.status IN (:...statuses)', { statuses: status });
      } else {
        queryBuilder.andWhere('task.status = :status', { status });
      }
    }

    if (type) queryBuilder.andWhere('task.type = :type', { type });
    if (priority) queryBuilder.andWhere('task.priority = :priority', { priority });
    if (dueBefore) queryBuilder.andWhere('task.dueDate <= :dueBefore', { dueBefore });
    if (dueAfter) queryBuilder.andWhere('task.dueDate >= :dueAfter', { dueAfter });

    queryBuilder
      .leftJoinAndSelect('task.patient', 'patient')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return { tasks, total };
  }

  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    Object.assign(task, updateTaskDto);

    // If status changed to completed, set completion metadata
    if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.completedBy = userId;
    }

    const updated = await this.taskRepository.save(task);

    await this.auditService.log({
      action: 'TASK_UPDATED',
      userId,
      resourceType: 'task',
      resourceId: id,
      details: { changes: updateTaskDto },
    });

    return updated;
  }

  async complete(id: string, userId: string, notes?: string): Promise<Task> {
    return this.update(id, userId, {
      status: TaskStatus.COMPLETED,
      completionNotes: notes,
    });
  }

  async cancel(id: string, userId: string, reason?: string): Promise<Task> {
    return this.update(id, userId, {
      status: TaskStatus.CANCELLED,
      completionNotes: reason,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.findById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.auditService.log({
      action: 'TASK_DELETED',
      userId,
      resourceType: 'task',
      resourceId: id,
    });

    await this.taskRepository.delete(id);
  }

  async getTaskStats(userId: string, isProvider: boolean): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueToday: number;
  }> {
    const whereClause = isProvider ? { assignedTo: userId } : { patientId: userId };
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const [total, pending, inProgress, completed, overdue, dueToday] = await Promise.all([
      this.taskRepository.count({ where: whereClause }),
      this.taskRepository.count({ where: { ...whereClause, status: TaskStatus.PENDING } }),
      this.taskRepository.count({ where: { ...whereClause, status: TaskStatus.IN_PROGRESS } }),
      this.taskRepository.count({ where: { ...whereClause, status: TaskStatus.COMPLETED } }),
      this.taskRepository.count({ where: { ...whereClause, status: TaskStatus.OVERDUE } }),
      this.taskRepository.count({
        where: {
          ...whereClause,
          status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
          dueDate: LessThanOrEqual(today),
        },
      }),
    ]);

    return { total, pending, inProgress, completed, overdue, dueToday };
  }

  // Cron job to mark overdue tasks and send reminders
  @Cron('0 */15 * * * *') // Every 15 minutes
  async processOverdueTasks(): Promise<void> {
    const now = new Date();

    // Mark overdue tasks
    const overdueTasks = await this.taskRepository.find({
      where: {
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        dueDate: LessThanOrEqual(now),
      },
      relations: ['assignee'],
    });

    for (const task of overdueTasks) {
      if (task.status !== TaskStatus.OVERDUE) {
        task.status = TaskStatus.OVERDUE;
        await this.taskRepository.save(task);
        await this.sendTaskNotification(task, 'overdue');
      }
    }

    this.logger.log(`Processed ${overdueTasks.length} overdue tasks`);
  }

  // Send reminders for tasks due soon
  @Cron('0 0 8 * * *') // Every day at 8 AM
  async sendTaskReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const dueSoonTasks = await this.taskRepository.find({
      where: {
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        dueDate: LessThanOrEqual(tomorrow),
        reminderSent: false,
      },
      relations: ['assignee'],
    });

    for (const task of dueSoonTasks) {
      await this.sendTaskNotification(task, 'reminder');
      task.reminderSent = true;
      task.reminderSentAt = new Date();
      await this.taskRepository.save(task);
    }

    this.logger.log(`Sent ${dueSoonTasks.length} task reminders`);
  }

  // Process recurring tasks
  @Cron('0 0 0 * * *') // Every day at midnight
  async processRecurringTasks(): Promise<void> {
    const recurringTasks = await this.taskRepository.find({
      where: {
        isRecurring: true,
        status: TaskStatus.COMPLETED,
      },
    });

    for (const task of recurringTasks) {
      // Check if we need to create next occurrence
      if (this.shouldCreateNextOccurrence(task)) {
        const nextDueDate = this.calculateNextDueDate(task);

        if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) {
          continue;
        }

        await this.create({
          type: task.type,
          title: task.title,
          description: task.description,
          patientId: task.patientId,
          assignedTo: task.assignedTo,
          createdBy: task.createdBy,
          priority: task.priority,
          dueDate: nextDueDate,
          isRecurring: true,
          recurrencePattern: task.recurrencePattern,
          recurrenceInterval: task.recurrenceInterval,
          recurrenceEndDate: task.recurrenceEndDate,
          metadata: task.metadata,
        });
      }
    }
  }

  private shouldCreateNextOccurrence(task: Task): boolean {
    // Check if next occurrence already exists
    const nextDueDate = this.calculateNextDueDate(task);
    // Simplified check - in production, query database
    return nextDueDate !== null;
  }

  private calculateNextDueDate(task: Task): Date | null {
    if (!task.dueDate || !task.recurrencePattern || !task.recurrenceInterval) {
      return null;
    }

    const nextDate = new Date(task.dueDate);

    switch (task.recurrencePattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + task.recurrenceInterval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (task.recurrenceInterval * 7));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + task.recurrenceInterval);
        break;
      default:
        return null;
    }

    return nextDate;
  }

  private async sendTaskNotification(task: Task, notificationType: 'assigned' | 'reminder' | 'overdue'): Promise<void> {
    try {
      const messages = {
        assigned: `New task assigned: ${task.title}`,
        reminder: `Task reminder: ${task.title} is due soon`,
        overdue: `Task overdue: ${task.title}`,
      };

      if (task.assignee) {
        await this.notificationsService.create({
          userId: task.assignedTo,
          type: 'TASK',
          title: messages[notificationType],
          message: task.description || task.title,
          metadata: { taskId: task.id, notificationType },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send task notification: ${error.message}`, error.stack);
    }
  }
}
