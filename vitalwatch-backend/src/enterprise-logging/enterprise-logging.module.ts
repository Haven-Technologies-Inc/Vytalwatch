import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EnterpriseApiLog } from './entities/api-audit-log.entity';
import { EnterpriseLoggingService } from './enterprise-logging.service';
import { EnterpriseLoggingController } from './enterprise-logging.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EnterpriseApiLog]),
    ConfigModule,
  ],
  controllers: [EnterpriseLoggingController],
  providers: [EnterpriseLoggingService],
  exports: [EnterpriseLoggingService],
})
export class EnterpriseLoggingModule {}
