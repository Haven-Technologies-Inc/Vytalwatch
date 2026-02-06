import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConsentsService, CreateConsentDto, RevokeConsentDto } from './consents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ConsentType } from './entities/consent.entity';

@Controller('consents')
@UseGuards(JwtAuthGuard)
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  async create(@Body() createConsentDto: CreateConsentDto, @Request() req) {
    return this.consentsService.create({
      ...createConsentDto,
      userId: req.user.role === UserRole.PATIENT ? req.user.id : createConsentDto.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(@Query() query: any) {
    return this.consentsService.findAll({
      userId: query.userId,
      type: query.type,
      status: query.status,
      version: query.version,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Get('my')
  async getMyConsents(@Request() req, @Query('activeOnly') activeOnly: string) {
    return this.consentsService.getUserConsents(req.user.id, activeOnly === 'true');
  }

  @Get('check/:type')
  async checkConsent(@Param('type') type: ConsentType, @Request() req) {
    const hasConsent = await this.consentsService.hasConsent(req.user.id, type);
    return { hasConsent, type };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStats(@Query('organizationId') organizationId?: string) {
    return this.consentsService.getConsentStats(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.consentsService.findById(id);
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string, @Body() revokeDto: RevokeConsentDto, @Request() req) {
    return this.consentsService.revoke(id, {
      ...revokeDto,
      revokedBy: req.user.id,
    });
  }

  @Post(':id/renew')
  async renew(@Param('id') id: string, @Body() createConsentDto: CreateConsentDto, @Request() req) {
    return this.consentsService.renew(id, {
      ...createConsentDto,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
