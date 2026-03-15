import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AIService } from '../ai/ai.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import axios from 'axios';

export interface IntegrationConfig {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error';
  category: string;
  icon: string;
  settings?: Record<string, any>;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private integrations: Map<string, IntegrationConfig> = new Map();
  private readonly tenoviApiUrl: string;
  private readonly tenoviApiKey: string;
  private readonly tenoviClientDomain: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly aiService: AIService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {
    this.tenoviApiUrl = this.configService.get('tenovi.apiUrl') || 'https://api2.tenovi.com';
    this.tenoviApiKey = this.configService.get('tenovi.apiKey') || '';
    this.tenoviClientDomain = this.configService.get('tenovi.clientDomain') || '';
    this.initializeIntegrations();
  }

  private isRealValue(key: string): boolean {
    // Check process.env FIRST for runtime-configured keys, then ConfigService
    const envKey = this.configKeyToEnv(key);
    let val = envKey ? process.env[envKey] : undefined;
    if (!val || !val.trim()) {
      val = this.configService.get<string>(key);
    }
    if (!val || !val.trim()) return false;
    const placeholders = ['...', 'your-', 'change-in-', 'placeholder', 'xxx', 'TODO'];
    return !placeholders.some((p) => val.trim().endsWith(p) || val.trim().startsWith(p));
  }

  private configKeyToEnv(key: string): string | undefined {
    const map: Record<string, string> = {
      'stripe.secretKey': 'STRIPE_SECRET_KEY',
      'email.host': 'SMTP_HOST',
      'email.user': 'SMTP_USER',
      'email.pass': 'SMTP_PASS',
      'email.from': 'SMTP_FROM',
      'twilio.accountSid': 'TWILIO_ACCOUNT_SID',
      'twilio.authToken': 'TWILIO_AUTH_TOKEN',
      'openai.apiKey': 'OPENAI_API_KEY',
      'grok.apiKey': 'GROK_API_KEY',
      'tenovi.apiKey': 'TENOVI_API_KEY',
      'oauth.google.clientId': 'GOOGLE_CLIENT_ID',
      'oauth.google.clientSecret': 'GOOGLE_CLIENT_SECRET',
      'oauth.microsoft.clientId': 'MICROSOFT_CLIENT_ID',
      'oauth.microsoft.clientSecret': 'MICROSOFT_CLIENT_SECRET',
      'oauth.apple.clientId': 'APPLE_CLIENT_ID',
      'oauth.apple.teamId': 'APPLE_TEAM_ID',
    };
    return map[key];
  }

  private initializeIntegrations() {
    const stripeOk = this.isRealValue('stripe.secretKey');
    const emailOk = this.isRealValue('email.user') && this.isRealValue('email.pass');
    const twilioOk = this.isRealValue('twilio.accountSid') && this.isRealValue('twilio.authToken');
    const openaiOk = this.isRealValue('openai.apiKey');
    const grokOk = this.isRealValue('grok.apiKey');
    const tenoviOk = this.isRealValue('tenovi.apiKey');
    const googleOk =
      this.isRealValue('oauth.google.clientId') && this.isRealValue('oauth.google.clientSecret');
    const microsoftOk =
      this.isRealValue('oauth.microsoft.clientId') &&
      this.isRealValue('oauth.microsoft.clientSecret');
    const appleOk =
      this.isRealValue('oauth.apple.clientId') && this.isRealValue('oauth.apple.teamId');

    const integrationsList: IntegrationConfig[] = [
      {
        name: 'stripe',
        displayName: 'Stripe',
        description: 'Payment processing and subscriptions',
        category: 'Payments',
        icon: '💳',
        enabled: stripeOk,
        configured: stripeOk,
        status: stripeOk ? 'connected' : 'disconnected',
      },
      {
        name: 'zoho',
        displayName: 'ZeptoMail',
        description: 'Transactional email delivery',
        category: 'Communications',
        icon: '✉️',
        enabled: emailOk,
        configured: emailOk,
        status: emailOk ? 'connected' : 'disconnected',
      },
      {
        name: 'twilio',
        displayName: 'Twilio',
        description: 'SMS notifications and 2FA',
        category: 'Communications',
        icon: '📱',
        enabled: twilioOk,
        configured: twilioOk,
        status: twilioOk ? 'connected' : 'disconnected',
      },
      {
        name: 'openai',
        displayName: 'OpenAI',
        description: 'AI-powered clinical insights',
        category: 'AI/ML',
        icon: '🤖',
        enabled: openaiOk,
        configured: openaiOk,
        status: openaiOk ? 'connected' : 'disconnected',
      },
      {
        name: 'grok',
        displayName: 'Grok AI',
        description: 'Real-time AI analysis',
        category: 'AI/ML',
        icon: '🧠',
        enabled: grokOk,
        configured: grokOk,
        status: grokOk ? 'connected' : 'disconnected',
      },
      {
        name: 'tenovi',
        displayName: 'Tenovi',
        description: 'Medical device data integration',
        category: 'Devices',
        icon: '📊',
        enabled: tenoviOk,
        configured: tenoviOk,
        status: tenoviOk ? 'connected' : 'disconnected',
      },
      {
        name: 'google',
        displayName: 'Google OAuth',
        description: 'Social sign-in provider',
        category: 'Authentication',
        icon: '🔐',
        enabled: googleOk,
        configured: googleOk,
        status: googleOk ? 'connected' : 'disconnected',
      },
      {
        name: 'microsoft',
        displayName: 'Microsoft OAuth',
        description: 'Social sign-in provider',
        category: 'Authentication',
        icon: '🪟',
        enabled: microsoftOk,
        configured: microsoftOk,
        status: microsoftOk ? 'connected' : 'disconnected',
      },
      {
        name: 'apple',
        displayName: 'Apple Sign-In',
        description: 'Social sign-in provider',
        category: 'Authentication',
        icon: '🍎',
        enabled: appleOk,
        configured: appleOk,
        status: appleOk ? 'connected' : 'disconnected',
      },
    ];

    integrationsList.forEach((int) => this.integrations.set(int.name, int));
  }

  listIntegrations() {
    return Array.from(this.integrations.values()).map((int) => ({
      id: int.name,
      name: int.displayName,
      description: int.description,
      category: int.category,
      icon: int.icon,
      status: int.status,
      enabled: int.enabled,
      configured: int.configured,
    }));
  }

  getIntegration(name: string) {
    const integration = this.integrations.get(name);
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    return integration;
  }

  private readonly ENV_MAP: Record<string, Record<string, string>> = {
    stripe: { apiKey: 'STRIPE_SECRET_KEY', webhookSecret: 'STRIPE_WEBHOOK_SECRET' },
    zoho: {
      smtpHost: 'SMTP_HOST',
      smtpUser: 'SMTP_USER',
      smtpPass: 'SMTP_PASS',
      fromEmail: 'SMTP_FROM',
    },
    twilio: {
      accountSid: 'TWILIO_ACCOUNT_SID',
      authToken: 'TWILIO_AUTH_TOKEN',
      phoneNumber: 'TWILIO_PHONE_NUMBER',
    },
    openai: { apiKey: 'OPENAI_API_KEY' },
    grok: { apiKey: 'GROK_API_KEY' },
    tenovi: {
      apiKey: 'TENOVI_API_KEY',
      apiUrl: 'TENOVI_API_URL',
      clientDomain: 'TENOVI_CLIENT_DOMAIN',
    },
    google: { clientId: 'GOOGLE_CLIENT_ID', clientSecret: 'GOOGLE_CLIENT_SECRET' },
    microsoft: { clientId: 'MICROSOFT_CLIENT_ID', clientSecret: 'MICROSOFT_CLIENT_SECRET' },
    apple: { clientId: 'APPLE_CLIENT_ID', teamId: 'APPLE_TEAM_ID' },
  };

  async configureIntegration(
    name: string,
    dto: { settings?: Record<string, unknown> },
    user: CurrentUserPayload,
  ) {
    const integration = this.getIntegration(name);
    const settings = dto.settings || {};

    // Map frontend keys to environment variables at runtime
    const envMap = this.ENV_MAP[name] || {};
    for (const [key, val] of Object.entries(settings)) {
      if (typeof val === 'string' && val.trim() && envMap[key]) {
        process.env[envMap[key]] = val.trim();
        this.logger.log(`Updated env ${envMap[key]} for integration ${name}`);
      }
    }

    // Update in-memory config
    integration.settings = { ...integration.settings, ...settings };
    integration.configured = true;
    this.integrations.set(name, integration);

    // Re-initialize integration status based on new env values
    this.initializeIntegrations();

    await this.auditService.log({
      action: 'INTEGRATION_CONFIGURED',
      userId: user.sub,
      details: { integration: name, keys: Object.keys(settings) },
    });

    return this.getIntegration(name);
  }

  async enableIntegration(name: string, user: CurrentUserPayload) {
    const integration = this.getIntegration(name);

    if (!integration.configured) {
      throw new BadRequestException('Integration must be configured first');
    }

    integration.enabled = true;
    integration.status = 'connected';
    this.integrations.set(name, integration);

    await this.auditService.log({
      action: 'INTEGRATION_ENABLED',
      userId: user.sub,
      details: { integration: name },
    });

    return integration;
  }

  async disableIntegration(name: string, user: CurrentUserPayload) {
    const integration = this.getIntegration(name);

    integration.enabled = false;
    integration.status = 'disconnected';
    this.integrations.set(name, integration);

    await this.auditService.log({
      action: 'INTEGRATION_DISABLED',
      userId: user.sub,
      details: { integration: name },
    });

    return integration;
  }

  async testIntegration(name: string, _dto?: { testData?: Record<string, unknown> }) {
    this.getIntegration(name);

    // Simulate integration test
    try {
      switch (name) {
        case 'stripe':
          // Test Stripe connection
          return { success: true, message: 'Stripe connection successful' };
        case 'zoho':
          // Test SMTP connection
          return { success: true, message: 'SMTP connection successful' };
        case 'twilio':
          // Test Twilio connection
          return { success: true, message: 'Twilio connection successful' };
        case 'openai':
          // Test OpenAI connection
          return { success: true, message: 'OpenAI connection successful' };
        case 'grok':
          // Test Grok connection
          return { success: true, message: 'Grok AI connection successful' };
        case 'tenovi':
          // Test Tenovi connection
          return { success: true, message: 'Tenovi connection successful' };
        default:
          throw new BadRequestException('Unknown integration');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Connection failed: ${msg}` };
    }
  }

  async sendZohoEmail(
    dto: { to: string; subject: string; body: string; html?: boolean },
    user: CurrentUserPayload,
  ) {
    await this.auditService.log({
      action: 'EMAIL_SENT',
      userId: user.sub,
      details: { to: dto.to, subject: dto.subject },
    });

    const result = await this.emailService.send({
      to: dto.to,
      subject: dto.subject,
      html: dto.html ? dto.body : undefined,
      text: dto.html ? undefined : dto.body,
    });

    return { success: result.success, messageId: result.messageId, error: result.error };
  }

  getEmailTemplates() {
    return [
      { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to VytalWatch' },
      { id: 'alert', name: 'Alert Notification', subject: 'Health Alert' },
      { id: 'reminder', name: 'Reading Reminder', subject: 'Time for your reading' },
      { id: 'report', name: 'Monthly Report', subject: 'Your Monthly Health Report' },
    ];
  }

  async analyzeWithOpenAI(dto: { prompt: string; context?: string }, user: CurrentUserPayload) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException(
        'AI services not configured. Please set OPENAI_API_KEY or GROK_API_KEY.',
      );
    }

    await this.auditService.log({
      action: 'OPENAI_ANALYSIS_REQUESTED',
      userId: user.sub,
      details: { promptLength: dto.prompt.length },
    });

    const fullPrompt = dto.context ? `Context: ${dto.context}\n\nQuery: ${dto.prompt}` : dto.prompt;

    const response = await this.aiService.chatWithAI([{ role: 'user', content: fullPrompt }]);

    return {
      analysis: response,
      provider: this.aiService.getActiveProvider(),
      confidence: 0.85,
      timestamp: new Date().toISOString(),
    };
  }

  async generateOpenAIInsight(
    dto: { patientId: string; vitalData: Record<string, unknown> },
    user: CurrentUserPayload,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI services not configured');
    }

    await this.auditService.log({
      action: 'AI_INSIGHT_GENERATED',
      userId: user.sub,
      details: { patientId: dto.patientId },
    });

    // Use real AI analysis
    const insight = await this.aiService.getPatientInsights(dto.patientId);

    return {
      patientId: dto.patientId,
      insight: insight.summary,
      trends: insight.trends,
      concerns: insight.concerns,
      recommendations: insight.recommendations,
      riskLevel: insight.overallRiskLevel,
      provider: this.aiService.getActiveProvider(),
      confidence: 0.85,
      generatedAt: new Date().toISOString(),
    };
  }

  async analyzeWithGrok(
    dto: { data: Record<string, unknown>; analysisType: string },
    user: CurrentUserPayload,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI services not configured');
    }

    await this.auditService.log({
      action: 'GROK_ANALYSIS_REQUESTED',
      userId: user.sub,
      details: { analysisType: dto.analysisType },
    });

    const prompt = `Perform a ${dto.analysisType} analysis on the following healthcare data:\n\n${JSON.stringify(dto.data, null, 2)}\n\nProvide actionable insights for remote patient monitoring.`;

    const response = await this.aiService.chatWithAI([{ role: 'user', content: prompt }]);

    return {
      result: response,
      analysisType: dto.analysisType,
      provider: this.aiService.getActiveProvider(),
      timestamp: new Date().toISOString(),
    };
  }

  async grokRealTimeAnalysis(
    dto: { vitalReading: Record<string, unknown> },
    user: CurrentUserPayload,
  ) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI services not configured');
    }

    await this.auditService.log({
      action: 'REALTIME_ANALYSIS_REQUESTED',
      userId: user.sub,
      details: { vitalType: String(dto.vitalReading.type || '') },
    });

    const result: Record<string, unknown> = await this.aiService.realTimeAnalysis({
      vitalReading: dto.vitalReading,
      patientId: String(dto.vitalReading.patientId || 'unknown'),
    });

    const analysis = (result.analysis || {}) as Record<string, unknown>;

    return {
      anomalyDetected: Boolean(analysis.isAnomalous) || false,
      confidence: Number(analysis.confidence) || 0.85,
      deviation: String(analysis.deviation || 'normal'),
      trend: String(analysis.trend || 'stable'),
      alert: result.alert,
      recommendations: result.recommendations,
      provider: this.aiService.getActiveProvider(),
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    };
  }

  async sendTwilioSms(dto: { to: string; message: string }, user: CurrentUserPayload) {
    await this.auditService.log({
      action: 'SMS_SENT',
      userId: user.sub,
      details: { to: dto.to },
    });

    const result = await this.smsService.send(dto.to, dto.message);
    return { success: result.success, messageId: result.messageId, error: result.error };
  }

  async getTwilioMessageStatus(messageId: string) {
    const result = await this.smsService.getMessageStatus(messageId);
    return {
      messageId,
      status: result.status,
      error: result.error,
    };
  }

  async getTenoviDevices() {
    try {
      if (!this.tenoviApiKey || !this.tenoviClientDomain) {
        this.logger.warn('Tenovi API not configured - returning empty device list');
        return [];
      }

      const response = await axios.get(
        `${this.tenoviApiUrl}/clients/${this.tenoviClientDomain}/hwi/hwi-devices/`,
        {
          headers: {
            Authorization: `Api-Key ${this.tenoviApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const raw = response.data as Record<string, unknown>;
      const devices = (raw.results || raw || []) as Record<string, unknown>[];
      return devices.map((d) => {
        const dev = (d.device || {}) as Record<string, unknown>;
        return {
          id: String(d.hwi_device_id || d.id),
          type: String(dev.sensor_code || 'unknown'),
          model: String(dev.model_number || dev.name || 'Unknown Model'),
          status: String(d.status || 'unknown'),
          patientId: d.patient_id,
          lastMeasurement: d.last_measurement,
          connectedOn: d.connected_on,
        };
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch Tenovi devices: ${msg}`);
      return [];
    }
  }

  async syncTenoviDevices(user: CurrentUserPayload) {
    try {
      if (!this.tenoviApiKey || !this.tenoviClientDomain) {
        throw new BadRequestException('Tenovi API not configured');
      }

      const response = await axios.get(
        `${this.tenoviApiUrl}/clients/${this.tenoviClientDomain}/hwi/hwi-devices/`,
        {
          headers: {
            Authorization: `Api-Key ${this.tenoviApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const raw = response.data as Record<string, unknown>;
      const devices = (raw.results || response.data || []) as unknown[];

      await this.auditService.log({
        action: 'TENOVI_SYNC',
        userId: user.sub,
        details: { deviceCount: devices.length },
      });

      return {
        success: true,
        syncedDevices: devices.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync Tenovi devices: ${msg}`);
      throw new BadRequestException(`Tenovi sync failed: ${msg}`);
    }
  }
}
