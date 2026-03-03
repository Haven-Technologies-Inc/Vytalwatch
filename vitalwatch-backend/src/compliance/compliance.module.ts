import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { PHIAccessLog } from './entities/phi-access-log.entity';
import { PatientConsent } from './entities/patient-consent.entity';
import { BusinessAssociateAgreement } from './entities/business-associate-agreement.entity';
import { DataRetentionPolicy } from './entities/data-retention-policy.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PHIAccessLog,
      PatientConsent,
      BusinessAssociateAgreement,
      DataRetentionPolicy,
    ]),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
