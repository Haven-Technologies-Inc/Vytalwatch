import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskStatus } from './entities/task.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() data: Partial<Task>): Promise<Task> {
    return this.tasksService.create(data);
  }

  @Get()
  findAll(@Query('status') status?: TaskStatus, @Query('assignedTo') assignedToUserId?: string, @Query('patientId') patientId?: string): Promise<Task[]> {
    return this.tasksService.findAll({ status, assignedToUserId, patientId });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<Task>): Promise<Task> {
    return this.tasksService.update(id, data);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() body: { userId: string; resolution?: string }): Promise<Task> {
    return this.tasksService.complete(id, body.userId, body.resolution);
  }
}
