import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { StaffRole } from './entities/staff-role.entity';
import { StaffMember } from './entities/staff-member.entity';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole, StaffMember]), AuditModule],
  controllers: [StaffController],
  providers: [StaffService, PermissionsGuard],
  exports: [StaffService, PermissionsGuard],
})
export class StaffModule implements OnModuleInit {
  constructor(private readonly staffService: StaffService) {}

  async onModuleInit() {
    await this.staffService.seedSystemRoles();
  }
}
