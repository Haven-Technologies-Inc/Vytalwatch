import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskType, TaskPriority } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async create(data: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create(data);
    return this.taskRepository.save(task);
  }

  async findAll(filters?: { status?: TaskStatus; assignedToUserId?: string; patientId?: string }): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task');
    if (filters?.status) query.andWhere('task.status = :status', { status: filters.status });
    if (filters?.assignedToUserId) query.andWhere('task.assignedToUserId = :userId', { userId: filters.assignedToUserId });
    if (filters?.patientId) query.andWhere('task.patientId = :patientId', { patientId: filters.patientId });
    return query.orderBy('task.dueAt', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, data: Partial<Task>): Promise<Task> {
    await this.taskRepository.update(id, data);
    return this.findOne(id);
  }

  async complete(id: string, userId: string, resolution?: string): Promise<Task> {
    return this.update(id, { status: TaskStatus.COMPLETED, completedAt: new Date(), completedBy: userId, resolution });
  }
}
