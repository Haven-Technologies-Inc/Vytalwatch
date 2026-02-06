import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService, CreateTaskDto, UpdateTaskDto, TaskQueryOptions } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TaskStatus } from './entities/task.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create({
      ...createTaskDto,
      createdBy: req.user.id,
    });
  }

  @Get()
  async findAll(@Query() query: any, @Request() req) {
    const options: TaskQueryOptions = {
      patientId: query.patientId,
      assignedTo: query.assignedTo,
      status: query.status ? (Array.isArray(query.status) ? query.status : [query.status]) : undefined,
      type: query.type,
      priority: query.priority,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    };

    // Patients can only see their own tasks
    if (req.user.role === UserRole.PATIENT) {
      options.patientId = req.user.id;
    }

    // Providers see tasks assigned to them by default
    if (req.user.role === UserRole.PROVIDER && !options.patientId && !options.assignedTo) {
      options.assignedTo = req.user.id;
    }

    return this.tasksService.findAll(options);
  }

  @Get('stats')
  async getStats(@Request() req) {
    const isProvider = [UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(req.user.role);
    return this.tasksService.getTaskStats(req.user.id, isProvider);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req) {
    return this.tasksService.update(id, req.user.id, updateTaskDto);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body('notes') notes: string, @Request() req) {
    return this.tasksService.complete(id, req.user.id, notes);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Request() req) {
    return this.tasksService.cancel(id, req.user.id, reason);
  }

  @Delete(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async delete(@Param('id') id: string, @Request() req) {
    await this.tasksService.delete(id, req.user.id);
    return { message: 'Task deleted successfully' };
  }
}
