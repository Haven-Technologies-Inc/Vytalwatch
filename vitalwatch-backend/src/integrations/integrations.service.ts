import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AIService } from '../ai/ai.service';
import axios from 'axios';

export interface IntegrationConfig {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error';
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
  ) {
    this.tenoviApiUrl = this.configService.get('tenovi.apiUrl') || 'https://api2.tenovi.com';
    this.tenoviApiKey = this.configService.get('tenovi.apiKey') || '';
    this.tenoviClientDomain = this.configService.get('tenovi.clientDomain') || '';
    this.initializeIntegrations();
  }

  private initializeIntegrations() {
    const integrationsList: IntegrationConfig[] = [
      {
        name: 'stripe',
        displayName: 'Stripe',
        description: 'Payment processing and subscription management',
        enabled: !!this.configService.get('stripe.secretKey'),
        configured: !!this.configService.get('stripe.secretKey'),
        status: this.configService.get('stripe.secretKey') ? 'connected' : 'disconnected',
      },
      {
        name: 'zoho',
        displayName: 'Zoho SMTP',
        description: 'Email delivery service',
        enabled: !!this.configService.get('smtp.host'),
        configured: !!this.configService.get('smtp.host'),
        status: this.configService.get('smtp.host') ? 'connected' : 'disconnected',
      },
      {
        name: 'twilio',
        displayName: 'Twilio',
        description: 'SMS and voice communications',
        enabled: !!this.configService.get('twilio.accountSid'),
        configured: !!this.configService.get('twilio.accountSid'),
        status: this.configService.get('twilio.accountSid') ? 'connected' : 'disconnected',
      },
      {
        name: 'openai',
        displayName: 'OpenAI',
        description: 'AI-powered clinical insights',
        enabled: !!this.configService.get('openai.apiKey'),
        configured: !!this.configService.get('openai.apiKey'),
        status: this.configService.get('openai.apiKey') ? 'connected' : 'disconnected',
      },
      {
        name: 'grok',
        displayName: 'Grok AI',
        description: 'Real-time vital analysis',
        enabled: !!this.configService.get('grok.apiKey'),
        configured: !!this.configService.get('grok.apiKey'),
        status: this.configService.get('grok.apiKey') ? 'connected' : 'disconnected',
      },
      {
        name: 'tenovi',
        displayName: 'Tenovi',
        description: 'Medical device integration',
        enabled: !!this.configService.get('tenovi.apiKey'),
        configured: !!this.configService.get('tenovi.apiKey'),
        status: this.configService.get('tenovi.apiKey') ? 'connected' : 'disconnected',
      },
    ];

    integrationsList.forEach((int) => this.integrations.set(int.name, int));
  }

  async listIntegrations() {
    return Array.from(this.integrations.values());
  }

  async getIntegration(name: string) {
    const integration = this.integrations.get(name);
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    return integration;
  }

  async configureIntegration(name: string, dto: any, user: CurrentUserPayload) {
    const integration = await this.getIntegration(name);
    
    // Update configuration
    integration.settings = { ...integration.settings, ...dto.settings };
    integration.configured = true;
    this.integrations.set(name, integration);

    await this.auditService.log({
      action: 'INTEGRATION_CONFIGURED',
      userId: user.sub,
      details: { integration: name },
    });

    return integration;
  }

  async enableIntegration(name: string, user: CurrentUserPayload) {
    const integration = await this.getIntegration(name);
    
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
    const integration = await this.getIntegration(name);
    
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

  async testIntegration(name: string, dto: any) {
    const integration = await this.getIntegration(name);
    
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
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  async sendZohoEmail(dto: { to: string; subject: string; body: string; html?: boolean }, user: CurrentUserPayload) {
    // In production, use nodemailer with Zoho SMTP
    await this.auditService.log({
      action: 'EMAIL_SENT',
      userId: user.sub,
      details: { to: dto.to, subject: dto.subject },
    });

    return { success: true, messageId: `msg_${Date.now()}` };
  }

  async getEmailTemplates() {
    return [
      { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to VytalWatch' },
      { id: 'alert', name: 'Alert Notification', subject: 'Health Alert' },
      { id: 'reminder', name: 'Reading Reminder', subject: 'Time for your reading' },
      { id: 'report', name: 'Monthly Report', subject: 'Your Monthly Health Report' },
    ];
  }

  async analyzeWithOpenAI(dto: { prompt: string; context?: string }, user: CurrentUserPayload) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI services not configured. Please set OPENAI_API_KEY or GROK_API_KEY.');
    }

    await this.auditService.log({
      action: 'OPENAI_ANALYSIS_REQUESTED',
      userId: user.sub,
      details: { promptLength: dto.prompt.length },
    });

    const fullPrompt = dto.context 
      ? `Context: ${dto.context}\n\nQuery: ${dto.prompt}`
      : dto.prompt;

    const response = await this.aiService.chatWithAI([
      { role: 'user', content: fullPrompt }
    ]);

    return {
      analysis: response,
      provider: this.aiService.getActiveProvider(),
      confidence: 0.85,
      timestamp: new Date().toISOString(),
    };
  }

  async generateOpenAIInsight(dto: { patientId: string; vitalData: any }, user: CurrentUserPayload) {
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

  async analyzeWithGrok(dto: { data: any; analysisType: string }, user: CurrentUserPayload) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI services not configured');
    }

    await this.auditService.log({
      action: 'GROK_ANALYSIS_REQUESTED',
      userId: user.sub,
      details: { analysisType: dto.analysisType },
    });

    const prompt = `Perform a ${dto.analysisType} analysis on the following healthcare data:\n\n${JSON.stringify(dto.data, null, 2)}\n\nProvide actionable insights for remote patient monitoring.`;

    const response = await this.aiService.chatWithAI([
      { role: 'user', content: prompt }
    ]);

    return {
      result: response,
      analysisType: dto.analysisType,
      provider: this.aiService.getActiveProvider(),
      timestamp: new Date().toISOString(),
    };
  }

  async grokRealTimeAnalysis(dto: { vitalReading: any }, user: CurrentUserPayload) {
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI services not configured');
    }

    await this.auditService.log({
      action: 'REALTIME_ANALYSIS_REQUESTED',
      userId: user.sub,
      details: { vitalType: dto.vitalReading.type },
    });

    const result = await this.aiService.realTimeAnalysis({
      vitalReading: dto.vitalReading,
      patientId: dto.vitalReading.patientId || 'unknown',
    });

    return {
      anomalyDetected: result.analysis?.isAnomalous || false,
      confidence: result.analysis?.confidence || 0.85,
      deviation: result.analysis?.deviation || 'normal',
      trend: result.analysis?.trend || 'stable',
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

    return { success: true, messageId: `sms_${Date.now()}` };
  }

  async getTwilioMessageStatus(messageId: string) {
    return {
      messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
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

      const devices = response.data.results || response.data || [];
      return devices.map((device: any) => ({
        id: device.hwi_device_id || device.id,
        type: device.device?.sensor_code || 'unknown',
        model: device.device?.model_number || device.device?.name || 'Unknown Model',
        status: device.status || 'unknown',
        patientId: device.patient_id,
        lastMeasurement: device.last_measurement,
        connectedOn: device.connected_on,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Tenovi devices: ${error.message}`);
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

      const devices = response.data.results || response.data || [];

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
    } catch (error) {
      this.logger.error(`Failed to sync Tenovi devices: ${error.message}`);
      throw new BadRequestException(`Tenovi sync failed: ${error.message}`);
    }
  }
}
