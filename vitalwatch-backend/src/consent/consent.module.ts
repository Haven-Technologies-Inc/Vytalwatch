import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { ConsentTemplate, PatientConsent } from './entities/consent.entity';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentTemplate, PatientConsent]),
    AuditModule,
    EmailModule,
  ],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule implements OnModuleInit {
  constructor(private readonly consentService: ConsentService) {}

  async onModuleInit() {
    // Seed default consent templates on application startup
    await this.consentService.seedDefaultTemplates();
  }
}
