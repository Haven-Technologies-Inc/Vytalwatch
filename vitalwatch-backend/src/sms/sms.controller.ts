import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SmsService } from './sms.service';

class SendSmsDto {
  to: string;
  template: string;
  data?: Record<string, any>;
}

class SendTestSmsDto {
  to: string;
  message: string;
}

@Controller('sms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  getStatus() {
    return {
      configured: this.smsService.isConfigured(),
      provider: 'twilio',
    };
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  getTemplates() {
    return {
      templates: [
        { id: 'verification_code', name: 'Verification Code', category: 'security' },
        { id: 'password_reset', name: 'Password Reset Code', category: 'security' },
        { id: 'magic_link', name: 'Magic Link Code', category: 'security' },
        { id: '2fa_code', name: 'Two-Factor Code', category: 'security' },
        { id: 'health_alert', name: 'Health Alert', category: 'alerts' },
        { id: 'critical_alert', name: 'Critical Alert', category: 'alerts' },
        { id: 'appointment_reminder', name: 'Appointment Reminder', category: 'appointments' },
        { id: 'appointment_confirmation', name: 'Appointment Confirmation', category: 'appointments' },
        { id: 'appointment_cancellation', name: 'Appointment Cancellation', category: 'appointments' },
        { id: 'medication_reminder', name: 'Medication Reminder', category: 'medications' },
        { id: 'medication_refill', name: 'Medication Refill Reminder', category: 'medications' },
        { id: 'reading_reminder', name: 'Vital Reading Reminder', category: 'vitals' },
        { id: 'abnormal_reading', name: 'Abnormal Reading Alert', category: 'vitals' },
        { id: 'device_shipped', name: 'Device Shipped', category: 'devices' },
        { id: 'device_connection', name: 'Device Connection Alert', category: 'devices' },
        { id: 'welcome', name: 'Welcome Message', category: 'account' },
        { id: 'security_alert', name: 'Security Alert', category: 'account' },
        { id: 'payment_reminder', name: 'Payment Reminder', category: 'billing' },
        { id: 'payment_confirmation', name: 'Payment Confirmation', category: 'billing' },
        { id: 'payment_failed', name: 'Payment Failed', category: 'billing' },
        { id: 'invite_code', name: 'Invite Code', category: 'account' },
        { id: 'monthly_report', name: 'Monthly Report Ready', category: 'reports' },
      ],
    };
  }

  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async sendTestSms(@Body() dto: SendTestSmsDto) {
    const result = await this.smsService.send(dto.to, dto.message);
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async sendTemplatedSms(@Body() dto: SendSmsDto) {
    const recipient = { phone: dto.to, firstName: dto.data?.firstName, lastName: dto.data?.lastName };

    switch (dto.template) {
      case 'verification_code':
        return this.smsService.sendVerificationCode(recipient, dto.data?.code || '000000');

      case 'password_reset':
        return this.smsService.sendPasswordResetCode(recipient, dto.data?.code || '000000');

      case 'magic_link':
        return this.smsService.sendMagicLinkCode(recipient, dto.data?.code || '000000');

      case '2fa_code':
        return this.smsService.send2FACode(recipient, dto.data?.code || '000000');

      case 'health_alert':
        return this.smsService.sendHealthAlert(recipient, {
          type: dto.data?.type || 'Health',
          severity: dto.data?.severity || 'warning',
          message: dto.data?.message || 'Please check your health status.',
          patientName: dto.data?.patientName,
        });

      case 'critical_alert':
        return this.smsService.sendCriticalAlert(recipient, {
          type: dto.data?.type || 'Vital',
          value: dto.data?.value || 'N/A',
          patientName: dto.data?.patientName,
        });

      case 'appointment_reminder':
        return this.smsService.sendAppointmentReminder(recipient, {
          providerName: dto.data?.providerName || 'Your Provider',
          dateTime: dto.data?.dateTime || new Date(),
          type: dto.data?.type,
        });

      case 'appointment_confirmation':
        return this.smsService.sendAppointmentConfirmation(recipient, {
          providerName: dto.data?.providerName || 'Your Provider',
          dateTime: dto.data?.dateTime || new Date(),
        });

      case 'appointment_cancellation':
        return this.smsService.sendAppointmentCancellation(recipient, {
          providerName: dto.data?.providerName || 'Your Provider',
          dateTime: dto.data?.dateTime || new Date(),
          reason: dto.data?.reason,
        });

      case 'medication_reminder':
        return this.smsService.sendMedicationReminder(recipient, {
          name: dto.data?.name || 'Medication',
          dosage: dto.data?.dosage || '1 pill',
          time: dto.data?.time || '9:00 AM',
        });

      case 'medication_refill':
        return this.smsService.sendMedicationRefillReminder(recipient, {
          name: dto.data?.name || 'Medication',
          daysRemaining: dto.data?.daysRemaining || 5,
        });

      case 'reading_reminder':
        return this.smsService.sendReadingReminder(recipient, dto.data?.vitalType || 'blood pressure');

      case 'abnormal_reading':
        return this.smsService.sendAbnormalReadingAlert(recipient, {
          type: dto.data?.type || 'vital',
          value: dto.data?.value || 'N/A',
          status: dto.data?.status || 'warning',
        });

      case 'device_shipped':
        return this.smsService.sendDeviceShipped(recipient, {
          name: dto.data?.name || 'Device',
          trackingNumber: dto.data?.trackingNumber,
          estimatedDelivery: dto.data?.estimatedDelivery,
        });

      case 'device_connection':
        return this.smsService.sendDeviceConnectionAlert(recipient, {
          name: dto.data?.name || 'Device',
          status: dto.data?.status || 'disconnected',
        });

      case 'welcome':
        return this.smsService.sendWelcome(recipient);

      case 'security_alert':
        return this.smsService.sendAccountSecurityAlert(recipient, {
          type: dto.data?.type || 'Login attempt',
          location: dto.data?.location,
          device: dto.data?.device,
        });

      case 'payment_reminder':
        return this.smsService.sendPaymentReminder(recipient, {
          amount: dto.data?.amount || '$0.00',
          dueDate: dto.data?.dueDate || 'soon',
        });

      case 'payment_confirmation':
        return this.smsService.sendPaymentConfirmation(recipient, {
          amount: dto.data?.amount || '$0.00',
          date: dto.data?.date || new Date().toLocaleDateString(),
        });

      case 'payment_failed':
        return this.smsService.sendPaymentFailed(recipient, {
          amount: dto.data?.amount || '$0.00',
          reason: dto.data?.reason,
        });

      case 'invite_code':
        return this.smsService.sendInviteCode(recipient, {
          code: dto.data?.code || 'INVITE123',
          inviterName: dto.data?.inviterName || 'VytalWatch',
          role: dto.data?.role || 'patient',
        });

      case 'monthly_report':
        return this.smsService.sendMonthlyReportReady(recipient, {
          month: dto.data?.month || new Date().toLocaleString('default', { month: 'long' }),
          year: dto.data?.year || new Date().getFullYear(),
        });

      default:
        return { success: false, error: `Unknown template: ${dto.template}` };
    }
  }

  @Get('status/:messageId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getMessageStatus(@Param('messageId') messageId: string) {
    return this.smsService.getMessageStatus(messageId);
  }
}
