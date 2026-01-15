import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Device } from './entities/device.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { TenoviWebhookController } from './tenovi-webhook.controller';
import { VitalsModule } from '../vitals/vitals.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ConfigModule,
    forwardRef(() => VitalsModule),
    AuditModule,
  ],
  controllers: [DevicesController, TenoviWebhookController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
