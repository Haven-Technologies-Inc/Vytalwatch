import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
