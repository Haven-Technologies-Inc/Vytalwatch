import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { VitalReading } from './entities/vital-reading.entity';
import { VitalsService } from './vitals.service';
import { VitalsController } from './vitals.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VitalReading]),
    ConfigModule,
    forwardRef(() => AlertsModule),
    AuditModule,
  ],
  controllers: [VitalsController],
  providers: [VitalsService],
  exports: [VitalsService],
})
export class VitalsModule {}
