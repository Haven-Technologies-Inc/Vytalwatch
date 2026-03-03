/**
 * VytalWatch Email Service
 * ZeptoMail Integration for transactional emails
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMailClient } from 'zeptomail';
import { EnterpriseLoggingService } from '../enterprise-logging/enterprise-logging.service';
import { ApiOperation, LogSeverity } from '../enterprise-logging/entities/api-audit-log.entity';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  templateId?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: SendMailClient | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly enterpriseLogger: EnterpriseLoggingService,
  ) {
    const zeptoToken = this.configService.get<string>('email.zeptoToken');
    
    if (zeptoToken) {
      this.client = new SendMailClient({
        url: 'api.zeptomail.com/',
        token: zeptoToken,
      });
      this.logger.log('ZeptoMail client initialized');
    } else {
      this.logger.warn('ZeptoMail token not configured - emails will be logged only');
    }

    this.fromEmail = this.configService.get<string>('email.from') || 'noreply@vytalwatch.ai';
    this.fromName = this.configService.get<string>('email.fromName') || 'VytalWatch AI';
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Log email for development/debugging
    this.logger.debug(`Sending email to ${recipients.join(', ')}: ${options.subject}`);

    if (!this.client) {
      this.logger.warn(`[DEV MODE] Email would be sent to: ${recipients.join(', ')}`);
      return { success: true, messageId: `dev_${Date.now()}` };
    }

    const startTime = Date.now();
    try {
      const response = await this.client.sendMail({
        from: { address: this.fromEmail, name: this.fromName },
        to: recipients.map(email => ({ email_address: { address: email } })),
        subject: options.subject,
        htmlbody: options.html,
        textbody: options.text,
      });

      this.logger.log(`Email sent successfully to ${recipients.join(', ')}`);
      await this.enterpriseLogger.logEmail({
        operation: ApiOperation.EMAIL_SEND, success: true,
        endpoint: 'api.zeptomail.com/sendMail', method: 'POST',
        durationMs: Date.now() - startTime,
        metadata: { recipientCount: recipients.length, subject: options.subject, messageId: response.request_id },
      });
      return { success: true, messageId: response.request_id };
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      await this.enterpriseLogger.logEmail({
        operation: ApiOperation.EMAIL_SEND, success: false, severity: LogSeverity.ERROR,
        endpoint: 'api.zeptomail.com/sendMail', method: 'POST',
        durationMs: Date.now() - startTime, errorMessage: error.message,
        metadata: { recipientCount: recipients.length, subject: options.subject },
      });
      return { success: false, error: error.message };
    }
  }

  // ==================== Email Templates ====================

  async sendWelcomeEmail(user: { email: string; firstName: string }): Promise<EmailResult> {
    const html = this.getTemplate('welcome', {
      firstName: user.firstName,
      loginUrl: `${this.configService.get('app.frontendUrl')}/login`,
    });

    return this.send({
      to: user.email,
      subject: 'Welcome to VytalWatch AI - Your Health Monitoring Journey Begins',
      html,
    });
  }

  async sendEmailVerification(user: { email: string; firstName: string }, token: string): Promise<EmailResult> {
    const verifyUrl = `${this.configService.get('app.frontendUrl')}/auth/verify?token=${token}`;
    
    const html = this.getTemplate('verification', {
      firstName: user.firstName,
      verifyUrl,
      expiresIn: '24 hours',
    });

    return this.send({
      to: user.email,
      subject: 'Verify Your VytalWatch AI Account',
      html,
    });
  }

  async sendPasswordReset(user: { email: string; firstName: string }, token: string): Promise<EmailResult> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/auth/reset-password?token=${token}`;
    
    const html = this.getTemplate('passwordReset', {
      firstName: user.firstName,
      resetUrl,
      expiresIn: '1 hour',
    });

    return this.send({
      to: user.email,
      subject: 'Reset Your VytalWatch AI Password',
      html,
    });
  }

  async sendMagicLink(user: { email: string; firstName: string }, token: string): Promise<EmailResult> {
    const magicUrl = `${this.configService.get('app.frontendUrl')}/auth/magic-link?token=${token}`;
    
    const html = this.getTemplate('magicLink', {
      firstName: user.firstName,
      magicUrl,
      expiresIn: '15 minutes',
    });

    return this.send({
      to: user.email,
      subject: 'Sign In to VytalWatch AI',
      html,
    });
  }

  async sendHealthAlert(
    user: { email: string; firstName: string },
    alert: { id: string; type: string; severity: 'info' | 'warning' | 'critical'; message: string; patientName?: string }
  ): Promise<EmailResult> {
    const alertUrl = `${this.configService.get('app.frontendUrl')}/alerts/${alert.id}`;
    
    const html = this.getTemplate('healthAlert', {
      firstName: user.firstName,
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message,
      patientName: alert.patientName,
      alertUrl,
      timestamp: new Date().toLocaleString(),
    });

    return this.send({
      to: user.email,
      subject: `[${alert.severity.toUpperCase()}] Health Alert: ${alert.type}`,
      html,
    });
  }

  async sendAppointmentReminder(
    user: { email: string; firstName: string },
    appointment: { id: string; providerName: string; dateTime: Date; type: string }
  ): Promise<EmailResult> {
    const appointmentUrl = `${this.configService.get('app.frontendUrl')}/appointments/${appointment.id}`;
    
    const html = this.getTemplate('appointmentReminder', {
      firstName: user.firstName,
      providerName: appointment.providerName,
      dateTime: appointment.dateTime.toLocaleString(),
      appointmentType: appointment.type,
      appointmentUrl,
    });

    return this.send({
      to: user.email,
      subject: `Appointment Reminder: ${appointment.type} with ${appointment.providerName}`,
      html,
    });
  }

  async sendMedicationReminder(
    user: { email: string; firstName: string },
    medication: { name: string; dosage: string; time: string }
  ): Promise<EmailResult> {
    const html = this.getTemplate('medicationReminder', {
      firstName: user.firstName,
      medicationName: medication.name,
      dosage: medication.dosage,
      time: medication.time,
    });

    return this.send({
      to: user.email,
      subject: `Medication Reminder: ${medication.name}`,
      html,
    });
  }

  async sendMonthlyReport(
    user: { email: string; firstName: string },
    report: { month: string; year: number; downloadUrl: string; summary: string }
  ): Promise<EmailResult> {
    const html = this.getTemplate('monthlyReport', {
      firstName: user.firstName,
      month: report.month,
      year: report.year,
      downloadUrl: report.downloadUrl,
      summary: report.summary,
    });

    return this.send({
      to: user.email,
      subject: `Your ${report.month} ${report.year} Health Report is Ready`,
      html,
    });
  }

  async sendInviteCode(
    email: string,
    invite: { code: string; role: string; organizationName: string; inviterName: string }
  ): Promise<EmailResult> {
    const signupUrl = `${this.configService.get('app.frontendUrl')}/register?invite=${invite.code}`;
    
    const html = this.getTemplate('inviteCode', {
      code: invite.code,
      role: invite.role,
      organizationName: invite.organizationName,
      inviterName: invite.inviterName,
      signupUrl,
    });

    return this.send({
      to: email,
      subject: `You're Invited to Join ${invite.organizationName} on VytalWatch AI`,
      html,
    });
  }

  async sendDeviceShipped(
    user: { email: string; firstName: string },
    device: { name: string; trackingNumber: string; trackingUrl: string; estimatedDelivery: string }
  ): Promise<EmailResult> {
    const html = this.getTemplate('deviceShipped', {
      firstName: user.firstName,
      deviceName: device.name,
      trackingNumber: device.trackingNumber,
      trackingUrl: device.trackingUrl,
      estimatedDelivery: device.estimatedDelivery,
    });

    return this.send({
      to: user.email,
      subject: `Your ${device.name} Has Shipped!`,
      html,
    });
  }

  // ==================== Template Engine ====================

  private getTemplate(templateName: string, data: Record<string, any>): string {
    const templates: Record<string, (data: Record<string, any>) => string> = {
      welcome: this.welcomeTemplate,
      verification: this.verificationTemplate,
      passwordReset: this.passwordResetTemplate,
      magicLink: this.magicLinkTemplate,
      healthAlert: this.healthAlertTemplate,
      appointmentReminder: this.appointmentReminderTemplate,
      medicationReminder: this.medicationReminderTemplate,
      monthlyReport: this.monthlyReportTemplate,
      inviteCode: this.inviteCodeTemplate,
      deviceShipped: this.deviceShippedTemplate,
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    return templateFn.call(this, data);
  }

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VytalWatch AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                VytalWatch<span style="color: #60a5fa;">AI</span>
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Intelligent Remote Patient Monitoring
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} VytalWatch AI. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                This email was sent by VytalWatch AI Healthcare Platform.<br>
                If you have questions, contact support@vytalwatch.ai
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private welcomeTemplate(data: { firstName: string; loginUrl: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">Welcome, ${data.firstName}! 🎉</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        We're thrilled to have you join VytalWatch AI, the leading platform for intelligent remote patient monitoring.
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        With VytalWatch AI, you can:
      </p>
      <ul style="margin: 0 0 24px; padding-left: 20px; color: #475569; font-size: 16px; line-height: 1.8;">
        <li>Track vital signs in real-time</li>
        <li>Receive AI-powered health insights</li>
        <li>Connect with healthcare providers</li>
        <li>Manage medications and appointments</li>
      </ul>
      <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Get Started
      </a>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
        Need help? Our support team is here for you 24/7.
      </p>
    `);
  }

  private verificationTemplate(data: { firstName: string; verifyUrl: string; expiresIn: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">Verify Your Email</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        Please verify your email address to complete your VytalWatch AI account setup.
      </p>
      <a href="${data.verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
        This link expires in ${data.expiresIn}. If you didn't create an account, please ignore this email.
      </p>
      <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px; word-break: break-all;">
        Or copy this link: ${data.verifyUrl}
      </p>
    `);
  }

  private passwordResetTemplate(data: { firstName: string; resetUrl: string; expiresIn: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">Reset Your Password</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
        This link expires in ${data.expiresIn}. If you didn't request a password reset, please ignore this email or contact support.
      </p>
    `);
  }

  private magicLinkTemplate(data: { firstName: string; magicUrl: string; expiresIn: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">Sign In to VytalWatch AI</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        Click the button below to securely sign in to your account. No password needed!
      </p>
      <a href="${data.magicUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Sign In Now
      </a>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
        This link expires in ${data.expiresIn}. If you didn't request this, please ignore this email.
      </p>
    `);
  }

  private healthAlertTemplate(data: { 
    firstName: string; 
    alertType: string; 
    severity: string; 
    message: string; 
    patientName?: string;
    alertUrl: string; 
    timestamp: string 
  }): string {
    const severityColors = {
      info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      critical: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    };
    const colors = severityColors[data.severity as keyof typeof severityColors] || severityColors.info;

    return this.baseTemplate(`
      <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px; color: ${colors.text}; font-size: 18px; text-transform: uppercase;">
          ${data.severity} Alert
        </h3>
        <p style="margin: 0; color: ${colors.text}; font-size: 14px;">
          ${data.alertType}
        </p>
      </div>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      ${data.patientName ? `<p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;"><strong>Patient:</strong> ${data.patientName}</p>` : ''}
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        ${data.message}
      </p>
      <a href="${data.alertUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Alert Details
      </a>
      <p style="margin: 24px 0 0; color: #94a3b8; font-size: 12px;">
        Alert generated at ${data.timestamp}
      </p>
    `);
  }

  private appointmentReminderTemplate(data: { 
    firstName: string; 
    providerName: string; 
    dateTime: string; 
    appointmentType: string;
    appointmentUrl: string 
  }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">📅 Appointment Reminder</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        This is a friendly reminder about your upcoming appointment:
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">APPOINTMENT TYPE</p>
        <p style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">${data.appointmentType}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">PROVIDER</p>
        <p style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">${data.providerName}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">DATE & TIME</p>
        <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">${data.dateTime}</p>
      </div>
      <a href="${data.appointmentUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Appointment
      </a>
    `);
  }

  private medicationReminderTemplate(data: { firstName: string; medicationName: string; dosage: string; time: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">💊 Medication Reminder</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        It's time to take your medication:
      </p>
      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #166534; font-size: 20px; font-weight: 600;">${data.medicationName}</p>
        <p style="margin: 0; color: #15803d; font-size: 16px;">Dosage: ${data.dosage}</p>
        <p style="margin: 8px 0 0; color: #15803d; font-size: 16px;">Scheduled: ${data.time}</p>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Taking your medications as prescribed is important for your health. If you have any concerns, please contact your healthcare provider.
      </p>
    `);
  }

  private monthlyReportTemplate(data: { firstName: string; month: string; year: number; downloadUrl: string; summary: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">📊 Your Monthly Health Report</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        Your health report for ${data.month} ${data.year} is now available.
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 16px;">Summary</h3>
        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${data.summary}</p>
      </div>
      <a href="${data.downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Download Report
      </a>
    `);
  }

  private inviteCodeTemplate(data: { code: string; role: string; organizationName: string; inviterName: string; signupUrl: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">You're Invited! 🎉</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        ${data.inviterName} has invited you to join <strong>${data.organizationName}</strong> on VytalWatch AI as a <strong>${data.role}</strong>.
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">YOUR INVITE CODE</p>
        <p style="margin: 0; color: #1e293b; font-size: 32px; font-weight: 700; letter-spacing: 4px;">${data.code}</p>
      </div>
      <a href="${data.signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">
        This invite code is valid for 7 days.
      </p>
    `);
  }

  private deviceShippedTemplate(data: { firstName: string; deviceName: string; trackingNumber: string; trackingUrl: string; estimatedDelivery: string }): string {
    return this.baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px;">📦 Your Device Has Shipped!</h2>
      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi ${data.firstName},
      </p>
      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
        Great news! Your <strong>${data.deviceName}</strong> is on its way.
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">TRACKING NUMBER</p>
        <p style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">${data.trackingNumber}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">ESTIMATED DELIVERY</p>
        <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">${data.estimatedDelivery}</p>
      </div>
      <a href="${data.trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Track Package
      </a>
    `);
  }
}
