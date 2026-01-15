import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { BillingRecord } from './entities/billing-record.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { WebhooksController } from './webhooks.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Invoice, BillingRecord]),
    ConfigModule,
    AuditModule,
  ],
  controllers: [BillingController, WebhooksController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
