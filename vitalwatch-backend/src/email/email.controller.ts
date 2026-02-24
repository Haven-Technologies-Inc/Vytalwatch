import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EmailService } from './email.service';

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Send a test email' })
  async sendTestEmail(
    @Body() dto: { to: string; template: string; data?: Record<string, any> }
  ) {
    const templates: Record<string, () => Promise<any>> = {
      welcome: () => this.emailService.sendWelcomeEmail({ 
        email: dto.to, 
        firstName: dto.data?.firstName || 'User' 
      }),
      verification: () => this.emailService.sendEmailVerification(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        dto.data?.token || 'test-token-123'
      ),
      passwordReset: () => this.emailService.sendPasswordReset(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        dto.data?.token || 'reset-token-123'
      ),
      magicLink: () => this.emailService.sendMagicLink(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        dto.data?.token || 'magic-token-123'
      ),
      healthAlert: () => this.emailService.sendHealthAlert(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        {
          id: 'alert-123',
          type: dto.data?.alertType || 'Blood Pressure',
          severity: dto.data?.severity || 'warning',
          message: dto.data?.message || 'Blood pressure reading is elevated: 145/92 mmHg',
          patientName: dto.data?.patientName,
        }
      ),
      appointmentReminder: () => this.emailService.sendAppointmentReminder(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        {
          id: 'apt-123',
          providerName: dto.data?.providerName || 'Dr. Smith',
          dateTime: new Date(dto.data?.dateTime || Date.now() + 86400000),
          type: dto.data?.appointmentType || 'Follow-up Visit',
        }
      ),
      medicationReminder: () => this.emailService.sendMedicationReminder(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        {
          name: dto.data?.medicationName || 'Lisinopril',
          dosage: dto.data?.dosage || '10mg',
          time: dto.data?.time || '8:00 AM',
        }
      ),
      monthlyReport: () => this.emailService.sendMonthlyReport(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        {
          month: dto.data?.month || 'February',
          year: dto.data?.year || 2026,
          downloadUrl: dto.data?.downloadUrl || 'https://vytalwatch.ai/reports/123',
          summary: dto.data?.summary || 'Your health metrics have improved this month. Blood pressure averages are within normal range.',
        }
      ),
      inviteCode: () => this.emailService.sendInviteCode(
        dto.to,
        {
          code: dto.data?.code || 'VWPRO2026',
          role: dto.data?.role || 'Provider',
          organizationName: dto.data?.organizationName || 'VytalWatch Health',
          inviterName: dto.data?.inviterName || 'Admin User',
        }
      ),
      deviceShipped: () => this.emailService.sendDeviceShipped(
        { email: dto.to, firstName: dto.data?.firstName || 'User' },
        {
          name: dto.data?.deviceName || 'Blood Pressure Monitor',
          trackingNumber: dto.data?.trackingNumber || '1Z999AA10123456784',
          trackingUrl: dto.data?.trackingUrl || 'https://ups.com/track/1Z999AA10123456784',
          estimatedDelivery: dto.data?.estimatedDelivery || 'February 25, 2026',
        }
      ),
    };

    const templateFn = templates[dto.template];
    if (!templateFn) {
      return { 
        success: false, 
        error: `Unknown template: ${dto.template}`,
        availableTemplates: Object.keys(templates),
      };
    }

    const result = await templateFn();
    return result;
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'List available email templates' })
  async listTemplates() {
    return {
      templates: [
        { id: 'welcome', name: 'Welcome Email', description: 'Sent to new users after registration' },
        { id: 'verification', name: 'Email Verification', description: 'Email address verification link' },
        { id: 'passwordReset', name: 'Password Reset', description: 'Password reset link' },
        { id: 'magicLink', name: 'Magic Link', description: 'Passwordless sign-in link' },
        { id: 'healthAlert', name: 'Health Alert', description: 'Critical/warning health alerts' },
        { id: 'appointmentReminder', name: 'Appointment Reminder', description: 'Upcoming appointment notification' },
        { id: 'medicationReminder', name: 'Medication Reminder', description: 'Time to take medication' },
        { id: 'monthlyReport', name: 'Monthly Report', description: 'Monthly health summary report' },
        { id: 'inviteCode', name: 'Invite Code', description: 'Provider/staff invitation' },
        { id: 'deviceShipped', name: 'Device Shipped', description: 'Device shipping notification' },
      ],
    };
  }
}
