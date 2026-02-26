import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EnterpriseLoggingService } from './enterprise-logging.service';
import { ApiProvider } from './entities/api-audit-log.entity';

@ApiTags('Enterprise Logging')
@Controller('enterprise-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnterpriseLoggingController {
  constructor(private readonly loggingService: EnterpriseLoggingService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Query enterprise API logs for audit' })
  @ApiQuery({ name: 'provider', required: false, enum: ApiProvider })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async queryLogs(
    @Query('provider') provider?: ApiProvider,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.loggingService.query({
      provider,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page || 1,
      limit: limit || 50,
    });
  }

  @Get('verify-integrity')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Verify log chain integrity for compliance audit' })
  async verifyIntegrity() {
    return this.loggingService.verifyIntegrity();
  }

  @Get('providers')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get list of API providers' })
  async getProviders() {
    return Object.values(ApiProvider);
  }
}
