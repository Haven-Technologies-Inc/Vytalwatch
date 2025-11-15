/**
 * ReshADX - SMS Service
 * SMS notifications for OTP and alerts
 */

import { Twilio } from 'twilio';
import { config } from '../config';
import { logger } from '../utils/logger';

export class SmsService {
  private client: Twilio;

  constructor() {
    this.client = new Twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    const message = `Your ReshADX verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

    await this.sendSMS(phoneNumber, message);

    logger.info('OTP SMS sent', { phoneNumber: this.maskPhoneNumber(phoneNumber) });
  }

  /**
   * Send login alert
   */
  async sendLoginAlert(phoneNumber: string, location: string, device: string): Promise<void> {
    const message = `ReshADX Security Alert: New login detected from ${location} on ${device}. If this wasn't you, secure your account immediately at ${config.server.url}/security`;

    await this.sendSMS(phoneNumber, message);

    logger.info('Login alert SMS sent', { phoneNumber: this.maskPhoneNumber(phoneNumber) });
  }

  /**
   * Send transaction alert
   */
  async sendTransactionAlert(phoneNumber: string, amount: number, merchant: string): Promise<void> {
    const message = `ReshADX: Transaction detected - ${amount} at ${merchant}. If unauthorized, report immediately.`;

    await this.sendSMS(phoneNumber, message);

    logger.info('Transaction alert SMS sent', { phoneNumber: this.maskPhoneNumber(phoneNumber) });
  }

  /**
   * Send account linked notification
   */
  async sendAccountLinkedNotification(phoneNumber: string, institutionName: string): Promise<void> {
    const message = `ReshADX: Your ${institutionName} account has been successfully linked. Manage connections at ${config.server.url}/connections`;

    await this.sendSMS(phoneNumber, message);

    logger.info('Account linked SMS sent', { phoneNumber: this.maskPhoneNumber(phoneNumber) });
  }

  /**
   * Generic send SMS method
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: message,
        from: config.twilio.fromNumber,
        to: to,
      });

      logger.info('SMS sent successfully', {
        to: this.maskPhoneNumber(to),
        length: message.length,
      });
    } catch (error) {
      logger.error('Failed to send SMS', {
        error,
        to: this.maskPhoneNumber(to),
      });
      throw error;
    }
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.slice(0, -4).replace(/./g, '*') + phoneNumber.slice(-4);
  }
}
