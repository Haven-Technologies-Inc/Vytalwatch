import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { AuditService } from '../audit/audit.service';

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsRecipient {
  phone: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: Twilio | null = null;
  private readonly fromNumber: string;
  private readonly appName = 'VytalWatch AI';

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.initializeTwilio();
    this.fromNumber = this.configService.get('twilio.phoneNumber') || '';
  }

  private initializeTwilio(): void {
    const accountSid = this.configService.get('twilio.accountSid');
    const authToken = this.configService.get('twilio.authToken');

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn('Twilio not configured - SMS will be logged only');
    }
  }

  isConfigured(): boolean {
    return !!this.twilioClient;
  }

  async send(to: string, body: string): Promise<SmsResult> {
    if (!this.twilioClient) {
      this.logger.warn(`[DEV MODE] SMS to ${to}: ${body}`);
      return { success: true, messageId: `dev_${Date.now()}` };
    }

    try {
      const message = await this.twilioClient.messages.create({
        body,
        to,
        from: this.fromNumber,
      });

      this.logger.log(`SMS sent to ${to}, SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}`, error);
      return { success: false, error: error.message };
    }
  }

  // ==================== VERIFICATION TEMPLATES ====================

  async sendVerificationCode(recipient: SmsRecipient, code: string): Promise<SmsResult> {
    const message = `${this.appName}: Your verification code is ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;
    
    await this.auditService.log({
      action: 'SMS_VERIFICATION_SENT',
      details: { phone: this.maskPhone(recipient.phone) },
    });

    return this.send(recipient.phone, message);
  }

  async sendPasswordResetCode(recipient: SmsRecipient, code: string): Promise<SmsResult> {
    const message = `${this.appName}: Your password reset code is ${code}. This code expires in 15 minutes. If you didn't request this, ignore this message.`;
    
    return this.send(recipient.phone, message);
  }

  async sendMagicLinkCode(recipient: SmsRecipient, code: string): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}, ` : '';
    const message = `${name}${this.appName}: Your sign-in code is ${code}. This code expires in 15 minutes.`;
    
    return this.send(recipient.phone, message);
  }

  async send2FACode(recipient: SmsRecipient, code: string): Promise<SmsResult> {
    const message = `${this.appName}: Your two-factor authentication code is ${code}. Valid for 5 minutes.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== HEALTH ALERT TEMPLATES ====================

  async sendHealthAlert(
    recipient: SmsRecipient,
    alert: { type: string; severity: string; message: string; patientName?: string },
  ): Promise<SmsResult> {
    const severityEmoji = this.getSeverityEmoji(alert.severity);
    const patientInfo = alert.patientName ? `Patient: ${alert.patientName}. ` : '';
    
    const message = `${severityEmoji} ${this.appName} ALERT [${alert.severity.toUpperCase()}]: ${patientInfo}${alert.type} - ${alert.message}`;
    
    await this.auditService.log({
      action: 'SMS_HEALTH_ALERT_SENT',
      details: { phone: this.maskPhone(recipient.phone), alertType: alert.type, severity: alert.severity },
    });

    return this.send(recipient.phone, message);
  }

  async sendCriticalAlert(
    recipient: SmsRecipient,
    alert: { type: string; value: string; patientName?: string },
  ): Promise<SmsResult> {
    const patientInfo = alert.patientName ? `for ${alert.patientName} ` : '';
    const message = `🚨 URGENT ${this.appName}: Critical ${alert.type} reading ${patientInfo}detected: ${alert.value}. Immediate attention required. Call 911 if emergency.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== APPOINTMENT TEMPLATES ====================

  async sendAppointmentReminder(
    recipient: SmsRecipient,
    appointment: { providerName: string; dateTime: Date | string; type?: string },
  ): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}, ` : '';
    const date = new Date(appointment.dateTime);
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const apptType = appointment.type ? ` (${appointment.type})` : '';
    
    const message = `${name}${this.appName} Reminder: Your appointment${apptType} with ${appointment.providerName} is on ${formattedDate} at ${formattedTime}. Reply CONFIRM to confirm.`;
    
    return this.send(recipient.phone, message);
  }

  async sendAppointmentConfirmation(
    recipient: SmsRecipient,
    appointment: { providerName: string; dateTime: Date | string },
  ): Promise<SmsResult> {
    const date = new Date(appointment.dateTime);
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    const message = `${this.appName}: Your appointment with ${appointment.providerName} is confirmed for ${formattedDate} at ${formattedTime}. We look forward to seeing you!`;
    
    return this.send(recipient.phone, message);
  }

  async sendAppointmentCancellation(
    recipient: SmsRecipient,
    appointment: { providerName: string; dateTime: Date | string; reason?: string },
  ): Promise<SmsResult> {
    const date = new Date(appointment.dateTime);
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const reason = appointment.reason ? ` Reason: ${appointment.reason}` : '';
    
    const message = `${this.appName}: Your appointment with ${appointment.providerName} on ${formattedDate} has been cancelled.${reason} Please reschedule at your convenience.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== MEDICATION TEMPLATES ====================

  async sendMedicationReminder(
    recipient: SmsRecipient,
    medication: { name: string; dosage: string; time: string },
  ): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}, ` : '';
    const message = `💊 ${name}${this.appName} Reminder: Time to take your ${medication.name} (${medication.dosage}). Scheduled for ${medication.time}.`;
    
    return this.send(recipient.phone, message);
  }

  async sendMedicationRefillReminder(
    recipient: SmsRecipient,
    medication: { name: string; daysRemaining: number },
  ): Promise<SmsResult> {
    const message = `${this.appName}: Your ${medication.name} prescription has ${medication.daysRemaining} days remaining. Please contact your pharmacy for a refill.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== VITAL READING TEMPLATES ====================

  async sendReadingReminder(recipient: SmsRecipient, vitalType: string): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}, ` : '';
    const message = `📊 ${name}${this.appName} Reminder: It's time to take your ${vitalType} reading. Open the app to record your measurement.`;
    
    return this.send(recipient.phone, message);
  }

  async sendAbnormalReadingAlert(
    recipient: SmsRecipient,
    reading: { type: string; value: string; status: string },
  ): Promise<SmsResult> {
    const emoji = reading.status === 'critical' ? '🚨' : '⚠️';
    const message = `${emoji} ${this.appName}: Your ${reading.type} reading of ${reading.value} is ${reading.status}. Please review in the app or contact your provider.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== DEVICE TEMPLATES ====================

  async sendDeviceShipped(
    recipient: SmsRecipient,
    device: { name: string; trackingNumber?: string; estimatedDelivery?: string },
  ): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}, ` : '';
    const tracking = device.trackingNumber ? ` Tracking: ${device.trackingNumber}` : '';
    const delivery = device.estimatedDelivery ? ` Est. delivery: ${device.estimatedDelivery}` : '';
    
    const message = `📦 ${name}${this.appName}: Your ${device.name} has shipped!${tracking}${delivery}`;
    
    return this.send(recipient.phone, message);
  }

  async sendDeviceConnectionAlert(
    recipient: SmsRecipient,
    device: { name: string; status: 'connected' | 'disconnected' },
  ): Promise<SmsResult> {
    const emoji = device.status === 'connected' ? '✅' : '⚠️';
    const statusText = device.status === 'connected' ? 'is now connected' : 'has disconnected';
    
    const message = `${emoji} ${this.appName}: Your ${device.name} ${statusText}. ${device.status === 'disconnected' ? 'Please check the device.' : ''}`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== ACCOUNT TEMPLATES ====================

  async sendWelcome(recipient: SmsRecipient): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}! ` : '';
    const message = `${name}Welcome to ${this.appName}! 🎉 Your account is ready. Download our app to get started with remote health monitoring.`;
    
    return this.send(recipient.phone, message);
  }

  async sendAccountSecurityAlert(
    recipient: SmsRecipient,
    event: { type: string; location?: string; device?: string },
  ): Promise<SmsResult> {
    const location = event.location ? ` from ${event.location}` : '';
    const device = event.device ? ` on ${event.device}` : '';
    
    const message = `🔐 ${this.appName} Security: ${event.type}${location}${device}. If this wasn't you, secure your account immediately.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== BILLING TEMPLATES ====================

  async sendPaymentReminder(
    recipient: SmsRecipient,
    payment: { amount: string; dueDate: string },
  ): Promise<SmsResult> {
    const message = `${this.appName}: Your payment of ${payment.amount} is due on ${payment.dueDate}. Log in to manage your subscription.`;
    
    return this.send(recipient.phone, message);
  }

  async sendPaymentConfirmation(
    recipient: SmsRecipient,
    payment: { amount: string; date: string },
  ): Promise<SmsResult> {
    const message = `✅ ${this.appName}: Payment of ${payment.amount} received on ${payment.date}. Thank you!`;
    
    return this.send(recipient.phone, message);
  }

  async sendPaymentFailed(
    recipient: SmsRecipient,
    payment: { amount: string; reason?: string },
  ): Promise<SmsResult> {
    const reason = payment.reason ? ` Reason: ${payment.reason}` : '';
    const message = `⚠️ ${this.appName}: Payment of ${payment.amount} failed.${reason} Please update your payment method.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== INVITE TEMPLATES ====================

  async sendInviteCode(
    recipient: SmsRecipient,
    invite: { code: string; inviterName: string; role: string },
  ): Promise<SmsResult> {
    const message = `${this.appName}: ${invite.inviterName} invited you to join as a ${invite.role}. Use code: ${invite.code} to sign up at vytalwatch.ai`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== MONTHLY REPORT TEMPLATE ====================

  async sendMonthlyReportReady(
    recipient: SmsRecipient,
    report: { month: string; year: number },
  ): Promise<SmsResult> {
    const name = recipient.firstName ? `Hi ${recipient.firstName}, ` : '';
    const message = `📊 ${name}${this.appName}: Your ${report.month} ${report.year} health report is ready! Log in to view your progress and insights.`;
    
    return this.send(recipient.phone, message);
  }

  // ==================== HELPER METHODS ====================

  private getSeverityEmoji(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟠';
      case 'low': return '🟡';
      default: return '⚠️';
    }
  }

  private maskPhone(phone: string): string {
    if (phone.length < 4) return '****';
    return `****${phone.slice(-4)}`;
  }

  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    if (!this.twilioClient) {
      return { status: 'unknown' };
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return { status: message.status };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}
