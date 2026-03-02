import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([VitalReading, AuditLog]),
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
