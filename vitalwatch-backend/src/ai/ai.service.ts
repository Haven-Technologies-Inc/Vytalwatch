import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { VitalReading, VitalType } from '../vitals/entities/vital-reading.entity';
import { Alert } from '../alerts/entities/alert.entity';

export interface AIAnalysisResult {
  analysis: string;
  riskScore: number; // 0-100
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface PatientInsight {
  summary: string;
  trends: string[];
  concerns: string[];
  recommendations: string[];
  overallRiskLevel: 'low' | 'moderate' | 'elevated' | 'high';
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;
  private grokClient: OpenAI; // Grok uses OpenAI-compatible API

  constructor(private readonly configService: ConfigService) {
    this.initializeClients();
  }

  private initializeClients(): void {
    const openaiKey = this.configService.get('openai.apiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const grokKey = this.configService.get('grok.apiKey');
    const grokBaseUrl = this.configService.get('grok.baseUrl');
    if (grokKey && grokBaseUrl) {
      this.grokClient = new OpenAI({
        apiKey: grokKey,
        baseURL: grokBaseUrl,
      });
    }
  }

  async analyzeVitalReading(vital: VitalReading): Promise<AIAnalysisResult> {
    const prompt = this.buildVitalAnalysisPrompt(vital);

    try {
      // Try OpenAI first, fallback to Grok
      const response = await this.getCompletion(prompt);
      return this.parseAnalysisResponse(response);
    } catch (error) {
      this.logger.error('Failed to analyze vital reading with AI', error);
      return this.getDefaultAnalysis(vital);
    }
  }

  async analyzePatientHistory(
    patientId: string,
    vitals: VitalReading[],
    alerts: Alert[],
  ): Promise<PatientInsight> {
    const prompt = this.buildPatientHistoryPrompt(vitals, alerts);

    try {
      const response = await this.getCompletion(prompt);
      return this.parsePatientInsightResponse(response);
    } catch (error) {
      this.logger.error('Failed to analyze patient history with AI', error);
      return this.getDefaultPatientInsight(vitals, alerts);
    }
  }

  async generateAlertRecommendation(alert: Alert, patientHistory: VitalReading[]): Promise<string[]> {
    const prompt = `
      You are a healthcare AI assistant helping providers respond to patient alerts.

      Alert Information:
      - Type: ${alert.type}
      - Severity: ${alert.severity}
      - Message: ${alert.message}
      - Created: ${alert.createdAt}

      Recent Vital History:
      ${this.formatVitalsForPrompt(patientHistory.slice(-10))}

      Provide 3-5 specific, actionable recommendations for the healthcare provider to address this alert.
      Consider the patient's recent vital trends when making recommendations.

      Format your response as a JSON array of strings, e.g., ["Recommendation 1", "Recommendation 2"]
    `;

    try {
      const response = await this.getCompletion(prompt);
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.error('Failed to generate alert recommendations', error);
      return this.getDefaultAlertRecommendations(alert);
    }
  }

  async chatWithAI(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    context?: { patientId?: string; vitals?: VitalReading[] },
  ): Promise<string> {
    const systemMessage = `
      You are VitalWatch AI, a healthcare assistant specialized in Remote Patient Monitoring (RPM).
      You help healthcare providers and patients understand health data, trends, and recommendations.

      Guidelines:
      - Always prioritize patient safety
      - Recommend seeking immediate medical attention for critical situations
      - Provide evidence-based health information
      - Be empathetic and supportive
      - Never provide specific medical diagnoses
      - Encourage patients to consult their healthcare providers for medical decisions

      ${context?.vitals ? `Recent vitals context:\n${this.formatVitalsForPrompt(context.vitals.slice(-5))}` : ''}
    `;

    const fullMessages = [
      { role: 'system' as const, content: systemMessage },
      ...messages,
    ];

    try {
      const client = this.openai || this.grokClient;
      if (!client) {
        throw new Error('No AI client configured');
      }

      const response = await client.chat.completions.create({
        model: this.openai ? this.configService.get('openai.model') || 'gpt-4' : 'grok-2',
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || 'Unable to generate response';
    } catch (error) {
      this.logger.error('Failed to chat with AI', error);
      return 'I apologize, but I am unable to process your request at the moment. Please try again later or contact support.';
    }
  }

  async generateHealthSummary(vitals: VitalReading[], alerts: Alert[]): Promise<string> {
    const prompt = `
      Generate a concise health summary for a patient based on the following data:

      Vital Readings (last 30 days):
      ${this.formatVitalsForPrompt(vitals)}

      Alerts (last 30 days):
      ${alerts.map(a => `- ${a.type}: ${a.severity} - ${a.message} (${a.createdAt})`).join('\n')}

      Provide a 2-3 paragraph summary that:
      1. Highlights overall health trends
      2. Notes any concerning patterns
      3. Provides encouraging feedback where appropriate
      4. Suggests areas for improvement

      Write in a professional but warm tone suitable for patient communication.
    `;

    try {
      return await this.getCompletion(prompt);
    } catch (error) {
      this.logger.error('Failed to generate health summary', error);
      return 'Your health summary is being processed. Please check back later.';
    }
  }

  private async getCompletion(prompt: string): Promise<string> {
    const client = this.openai || this.grokClient;
    if (!client) {
      throw new Error('No AI client configured');
    }

    const model = this.openai
      ? this.configService.get('openai.model') || 'gpt-4'
      : 'grok-2';

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || '';
  }

  private buildVitalAnalysisPrompt(vital: VitalReading): string {
    const typeNames: Record<VitalType, string> = {
      [VitalType.BLOOD_PRESSURE]: 'Blood Pressure',
      [VitalType.HEART_RATE]: 'Heart Rate',
      [VitalType.BLOOD_GLUCOSE]: 'Blood Glucose',
      [VitalType.SPO2]: 'Oxygen Saturation (SpO2)',
      [VitalType.TEMPERATURE]: 'Body Temperature',
      [VitalType.WEIGHT]: 'Weight',
      [VitalType.RESPIRATORY_RATE]: 'Respiratory Rate',
    };

    let valueStr = `${vital.value} ${vital.unit}`;
    if (vital.type === VitalType.BLOOD_PRESSURE) {
      valueStr = `${vital.systolic}/${vital.diastolic} mmHg`;
    }

    return `
      Analyze the following vital reading for a remote patient monitoring system:

      Vital Type: ${typeNames[vital.type]}
      Value: ${valueStr}
      Status: ${vital.status}
      Recorded: ${vital.recordedAt}

      Provide a JSON response with the following structure:
      {
        "analysis": "Brief analysis of the reading (2-3 sentences)",
        "riskScore": <number 0-100>,
        "recommendations": ["recommendation 1", "recommendation 2"],
        "urgency": "low|medium|high|critical"
      }
    `;
  }

  private buildPatientHistoryPrompt(vitals: VitalReading[], alerts: Alert[]): string {
    return `
      Analyze the following patient health data and provide insights:

      Vital Readings (recent history):
      ${this.formatVitalsForPrompt(vitals)}

      Alert History:
      ${alerts.map(a => `- ${a.type}: ${a.severity} - ${a.message}`).join('\n')}

      Provide a JSON response with the following structure:
      {
        "summary": "Overall health summary (2-3 sentences)",
        "trends": ["trend 1", "trend 2"],
        "concerns": ["concern 1", "concern 2"],
        "recommendations": ["recommendation 1", "recommendation 2"],
        "overallRiskLevel": "low|moderate|elevated|high"
      }
    `;
  }

  private formatVitalsForPrompt(vitals: VitalReading[]): string {
    return vitals.map(v => {
      if (v.type === VitalType.BLOOD_PRESSURE) {
        return `- ${v.type}: ${v.systolic}/${v.diastolic} mmHg (${v.status}) - ${v.recordedAt}`;
      }
      return `- ${v.type}: ${v.value} ${v.unit} (${v.status}) - ${v.recordedAt}`;
    }).join('\n');
  }

  private parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      return {
        analysis: parsed.analysis || 'Analysis unavailable',
        riskScore: Math.min(100, Math.max(0, parsed.riskScore || 50)),
        recommendations: parsed.recommendations || [],
        urgency: parsed.urgency || 'medium',
      };
    } catch {
      return {
        analysis: response,
        riskScore: 50,
        recommendations: [],
        urgency: 'medium',
      };
    }
  }

  private parsePatientInsightResponse(response: string): PatientInsight {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || 'Summary unavailable',
        trends: parsed.trends || [],
        concerns: parsed.concerns || [],
        recommendations: parsed.recommendations || [],
        overallRiskLevel: parsed.overallRiskLevel || 'moderate',
      };
    } catch {
      return {
        summary: response,
        trends: [],
        concerns: [],
        recommendations: [],
        overallRiskLevel: 'moderate',
      };
    }
  }

  private getDefaultAnalysis(vital: VitalReading): AIAnalysisResult {
    const urgencyMap = {
      normal: 'low' as const,
      warning: 'medium' as const,
      critical: 'critical' as const,
    };

    return {
      analysis: `${vital.type} reading recorded with status: ${vital.status}`,
      riskScore: vital.status === 'critical' ? 80 : vital.status === 'warning' ? 50 : 20,
      recommendations: ['Continue monitoring', 'Contact provider if symptoms worsen'],
      urgency: urgencyMap[vital.status] || 'medium',
    };
  }

  private getDefaultPatientInsight(vitals: VitalReading[], alerts: Alert[]): PatientInsight {
    const abnormalCount = vitals.filter(v => v.status !== 'normal').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

    let riskLevel: PatientInsight['overallRiskLevel'] = 'low';
    if (criticalAlerts > 0) riskLevel = 'high';
    else if (abnormalCount > vitals.length * 0.3) riskLevel = 'elevated';
    else if (abnormalCount > 0) riskLevel = 'moderate';

    return {
      summary: `Patient has ${vitals.length} recent vital readings with ${abnormalCount} abnormal values and ${alerts.length} alerts.`,
      trends: [],
      concerns: abnormalCount > 0 ? ['Some vital readings are outside normal range'] : [],
      recommendations: ['Continue regular monitoring', 'Follow up with healthcare provider as scheduled'],
      overallRiskLevel: riskLevel,
    };
  }

  private getDefaultAlertRecommendations(alert: Alert): string[] {
    const defaultRecs = [
      'Review patient history for context',
      'Contact patient to assess current condition',
      'Document findings in patient record',
    ];

    if (alert.severity === 'critical') {
      defaultRecs.unshift('Consider immediate intervention or emergency referral');
    }

    return defaultRecs;
  }
}
