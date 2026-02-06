import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TasksService, CreateTaskDto, UpdateTaskDto } from '../src/tasks/tasks.service';
import { Task, TaskType, TaskStatus, TaskPriority } from '../src/tasks/entities/task.entity';
import { AuditService } from '../src/audit/audit.service';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: Repository<Task>;
  let auditService: AuditService;
  let notificationsService: NotificationsService;

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    auditService = module.get<AuditService>(AuditService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    // Arrange
    const createTaskDto: CreateTaskDto = {
      type: TaskType.PATIENT_FOLLOWUP,
      title: 'Follow up with patient',
      description: 'Check blood pressure readings',
      patientId: 'patient-123',
      assignedTo: 'provider-456',
      createdBy: 'provider-456',
      priority: TaskPriority.HIGH,
      dueDate: new Date('2024-12-31'),
    };

    const mockTask = {
      id: 'task-123',
      ...createTaskDto,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new task successfully', async () => {
      // Arrange
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);
      mockAuditService.log.mockResolvedValue(undefined);
      mockNotificationsService.create.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createTaskDto);

      // Assert
      expect(taskRepository.create).toHaveBeenCalledWith({
        ...createTaskDto,
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
      });
      expect(taskRepository.save).toHaveBeenCalledWith(mockTask);
      expect(auditService.log).toHaveBeenCalledWith({
        action: 'TASK_CREATED',
        userId: createTaskDto.createdBy,
        resourceType: 'task',
        resourceId: mockTask.id,
        details: { type: createTaskDto.type, patientId: createTaskDto.patientId },
      });
      expect(result).toEqual(mockTask);
    });

    it('should set default priority to MEDIUM if not provided', async () => {
      // Arrange
      const dtoWithoutPriority = { ...createTaskDto };
      delete dtoWithoutPriority.priority;

      mockTaskRepository.create.mockReturnValue({ ...mockTask, priority: TaskPriority.MEDIUM });
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, priority: TaskPriority.MEDIUM });

      // Act
      await service.create(dtoWithoutPriority);

      // Assert
      expect(taskRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutPriority,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
      });
    });

    it('should send notification to assignee after creation', async () => {
      // Arrange
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      // Act
      await service.create(createTaskDto);

      // Assert
      expect(notificationsService.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a task by id', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        status: TaskStatus.PENDING,
      };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      // Act
      const result = await service.findById('task-123');

      // Assert
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        relations: ['patient', 'assignee', 'creator'],
      });
      expect(result).toEqual(mockTask);
    });

    it('should return null if task not found', async () => {
      // Arrange
      mockTaskRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateTaskDto: UpdateTaskDto = {
      title: 'Updated Title',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
    };

    it('should update a task successfully', async () => {
      // Arrange
      const existingTask = {
        id: 'task-123',
        title: 'Old Title',
        status: TaskStatus.PENDING,
        priority: TaskPriority.LOW,
      };

      const updatedTask = {
        ...existingTask,
        ...updateTaskDto,
      };

      mockTaskRepository.findOne.mockResolvedValue(existingTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);
      mockAuditService.log.mockResolvedValue(undefined);

      // Act
      const result = await service.update('task-123', 'user-123', updateTaskDto);

      // Assert
      expect(taskRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      // Arrange
      mockTaskRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent', 'user-123', updateTaskDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set completion metadata when status changed to COMPLETED', async () => {
      // Arrange
      const existingTask = {
        id: 'task-123',
        status: TaskStatus.IN_PROGRESS,
      };

      mockTaskRepository.findOne.mockResolvedValue(existingTask);
      mockTaskRepository.save.mockImplementation((task) => Promise.resolve(task));

      // Act
      await service.update('task-123', 'user-123', { status: TaskStatus.COMPLETED });

      // Assert
      const savedTask = mockTaskRepository.save.mock.calls[0][0];
      expect(savedTask.completedAt).toBeDefined();
      expect(savedTask.completedBy).toBe('user-123');
    });
  });

  describe('complete', () => {
    it('should complete a task with notes', async () => {
      // Arrange
      const mockTask = {
        id: 'task-123',
        status: TaskStatus.IN_PROGRESS,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completionNotes: 'Task completed successfully',
      });

      // Act
      const result = await service.complete('task-123', 'user-123', 'Task completed successfully');

      // Assert
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completionNotes).toBe('Task completed successfully');
    });
  });

  describe('delete', () => {
    it('should delete a task successfully', async () => {
      // Arrange
      const mockTask = { id: 'task-123', title: 'Test Task' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue({ affected: 1 });
      mockAuditService.log.mockResolvedValue(undefined);

      // Act
      await service.delete('task-123', 'user-123');

      // Assert
      expect(taskRepository.delete).toHaveBeenCalledWith('task-123');
      expect(auditService.log).toHaveBeenCalledWith({
        action: 'TASK_DELETED',
        userId: 'user-123',
        resourceType: 'task',
        resourceId: 'task-123',
      });
    });

    it('should throw NotFoundException if task not found', async () => {
      // Arrange
      mockTaskRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics for a provider', async () => {
      // Arrange
      mockTaskRepository.count.mockResolvedValueOnce(50); // total
      mockTaskRepository.count.mockResolvedValueOnce(20); // pending
      mockTaskRepository.count.mockResolvedValueOnce(15); // in progress
      mockTaskRepository.count.mockResolvedValueOnce(10); // completed
      mockTaskRepository.count.mockResolvedValueOnce(3); // overdue
      mockTaskRepository.count.mockResolvedValueOnce(8); // due today

      // Act
      const result = await service.getTaskStats('provider-123', true);

      // Assert
      expect(result).toEqual({
        total: 50,
        pending: 20,
        inProgress: 15,
        completed: 10,
        overdue: 3,
        dueToday: 8,
      });
    });

    it('should return task statistics for a patient', async () => {
      // Arrange
      mockTaskRepository.count.mockResolvedValueOnce(30); // total
      mockTaskRepository.count.mockResolvedValueOnce(10); // pending
      mockTaskRepository.count.mockResolvedValueOnce(5); // in progress
      mockTaskRepository.count.mockResolvedValueOnce(12); // completed
      mockTaskRepository.count.mockResolvedValueOnce(2); // overdue
      mockTaskRepository.count.mockResolvedValueOnce(3); // due today

      // Act
      const result = await service.getTaskStats('patient-123', false);

      // Assert
      expect(result).toEqual({
        total: 30,
        pending: 10,
        inProgress: 5,
        completed: 12,
        overdue: 2,
        dueToday: 3,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks with filters', async () => {
      // Arrange
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            { id: 'task-1', title: 'Task 1' },
            { id: 'task-2', title: 'Task 2' },
          ],
          2,
        ]),
      };

      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll({
        patientId: 'patient-123',
        status: TaskStatus.PENDING,
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });
});
