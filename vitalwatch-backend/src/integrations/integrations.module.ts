import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { AuditModule } from '../audit/audit.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AuditModule, AIModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
