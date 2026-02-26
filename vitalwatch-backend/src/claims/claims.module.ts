import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from './entities/claim.entity';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { Claim837PExportService } from './claim-837p-export.service';
import { AuditBundleService } from './audit-bundle.service';
import { ClaimsExportController } from './claims-export.controller';
import { ClearinghouseService } from './clearinghouse.service';
import { ClearinghouseController } from './clearinghouse.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Claim]), ConfigModule],
  providers: [ClaimsService, Claim837PExportService, AuditBundleService, ClearinghouseService],
  controllers: [ClaimsController, ClaimsExportController, ClearinghouseController],
  exports: [ClaimsService, Claim837PExportService, AuditBundleService, ClearinghouseService],
})
export class ClaimsModule {}
