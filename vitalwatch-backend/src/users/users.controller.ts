import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Put('me')
  async updateCurrentUser(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('role') role?: UserRole,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ organizationId, role, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.delete(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Get('provider/:providerId/patients')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientsByProvider(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.usersService.getPatientsByProvider(providerId);
  }

  @Post('patients/:patientId/assign/:providerId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async assignPatientToProvider(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.usersService.assignPatientToProvider(patientId, providerId);
  }
}
