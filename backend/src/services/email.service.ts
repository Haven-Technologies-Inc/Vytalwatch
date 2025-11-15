/**
 * ReshADX - Email Service
 * Email notifications and communications
 */

import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      },
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
    const verificationUrl = `${config.server.url}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ReshADX! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Thank you for registering with ReshADX, Africa's premier open banking platform.</p>
              <p>To complete your registration and verify your email address, please click the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">
                ${verificationUrl}
              </p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't create an account with ReshADX, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 ReshADX. All rights reserved.</p>
              <p>Open Banking for Africa 🌍</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify your ReshADX account',
      html,
    });

    logger.info('Verification email sent', { email });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
    const resetUrl = `${config.server.url}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request 🔐</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>We received a request to reset the password for your ReshADX account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">
                ${resetUrl}
              </p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged unless you click the link above</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 ReshADX. All rights reserved.</p>
              <p>If you have any questions, contact us at support@reshadx.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset your ReshADX password',
      html,
    });

    logger.info('Password reset email sent', { email });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .feature { background: white; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to ReshADX!</h1>
              <p>Your account is now active</p>
            </div>
            <div class="content">
              <h2>Hello ${firstName}! 👋</h2>
              <p>Your email has been verified and your ReshADX account is now active!</p>

              <h3>What's Next?</h3>

              <div class="feature">
                <h4>🏦 Connect Your Accounts</h4>
                <p>Link your bank accounts and mobile money wallets to start accessing your financial data.</p>
              </div>

              <div class="feature">
                <h4>📊 Get Your Credit Score</h4>
                <p>Discover your credit score powered by alternative African data sources.</p>
              </div>

              <div class="feature">
                <h4>🔒 Stay Secure</h4>
                <p>Your data is protected with bank-level security and encryption.</p>
              </div>

              <p style="text-align: center;">
                <a href="${config.server.url}/dashboard" class="button">Go to Dashboard</a>
              </p>

              <p>If you have any questions, our support team is here to help at <a href="mailto:support@reshadx.com">support@reshadx.com</a>.</p>
            </div>
            <div class="footer">
              <p>© 2025 ReshADX. All rights reserved.</p>
              <p>Building the future of finance in Africa 🌍</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to ReshADX - Your account is active!',
      html,
    });

    logger.info('Welcome email sent', { email });
  }

  /**
   * Generic send email method
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${config.email.from.name}" <${config.email.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }
}
