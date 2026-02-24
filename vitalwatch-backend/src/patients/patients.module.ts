import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { User } from '../users/entities/user.entity';
import { VitalsModule } from '../vitals/vitals.module';
import { AlertsModule } from '../alerts/alerts.module';
import { DevicesModule } from '../devices/devices.module';
import { AIModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    VitalsModule,
    AlertsModule,
    DevicesModule,
    AIModule,
    AuditModule,
    EmailModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
