import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// Database
import { DatabaseModule } from './database/database.module';

// Common Modules
import { CryptoModule } from './common/crypto/crypto.module';
import { HealthModule } from './health/health.module';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VitalsModule } from './vitals/vitals.module';
import { AlertsModule } from './alerts/alerts.module';
import { DevicesModule } from './devices/devices.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AIModule } from './ai/ai.module';
import { PatientsModule } from './patients/patients.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MessagingModule } from './messaging/messaging.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicationsModule } from './medications/medications.module';
import { WebRTCModule } from './webrtc/webrtc.module';
import { WebSocketModule } from './websocket/websocket.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { ClinicalNotesModule } from './clinical-notes/clinical-notes.module';
import { ConsentModule } from './consent/consent.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ThresholdPoliciesModule } from './threshold-policies/threshold-policies.module';
import { AIDraftsModule } from './ai-drafts/ai-drafts.module';
import { ClaimsModule } from './claims/claims.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RPMBatchModule } from './common/rpm-batch.module';
import { EnterpriseLoggingModule } from './enterprise-logging/enterprise-logging.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Database
    DatabaseModule,

    // Common modules
    CryptoModule,
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    VitalsModule,
    AlertsModule,
    DevicesModule,
    BillingModule,
    NotificationsModule,
    AuditModule,
    AIModule,
    PatientsModule,
    OrganizationsModule,
    MessagingModule,
    AnalyticsModule,
    IntegrationsModule,
    ReportsModule,
    AdminModule,
    AppointmentsModule,
    MedicationsModule,
    WebRTCModule,
    WebSocketModule,
    EmailModule,
    SmsModule,
    ClinicalNotesModule,
    ConsentModule,
    TasksModule,
    TimeTrackingModule,
    EnrollmentsModule,
    ThresholdPoliciesModule,
    AIDraftsModule,
    ClaimsModule,
    ScheduleModule.forRoot(),
    RPMBatchModule,
    EnterpriseLoggingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
