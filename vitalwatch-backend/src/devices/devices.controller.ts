import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DevicesService, RegisterDeviceDto } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DeviceStatus } from './entities/device.entity';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async register(@Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(dto);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findByPatient(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.devicesService.findByPatient(patientId);
  }

  @Get('me')
  async getMyDevices(@CurrentUser() user: CurrentUserPayload) {
    return this.devicesService.findByPatient(user.sub);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.devicesService.getDeviceStats(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.findById(id);
  }

  @Put(':id/status')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: DeviceStatus,
  ) {
    return this.devicesService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(@Param('id', ParseUUIDPipe) id: string) {
    await this.devicesService.unregister(id);
  }
}
