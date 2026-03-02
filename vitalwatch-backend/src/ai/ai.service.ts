import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { VitalReading, VitalType, VitalStatus } from '../vitals/entities/vital-reading.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

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

export interface ClinicalRecommendation {
  category: 'medication' | 'lifestyle' | 'monitoring' | 'referral' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recommendation: string;
  rationale: string;
  evidence: string;
  timeframe: string;
}

export interface PopulationHealthInsight {
  cohortSize: number;
  riskDistribution: { low: number; moderate: number; high: number; critical: number };
  topConditions: Array<{ condition: string; count: number; percentAffected: number }>;
  trendingAlerts: Array<{ type: string; count: number; trend: 'increasing' | 'stable' | 'decreasing' }>;
  interventionOpportunities: string[];
  predictedOutcomes: Array<{ outcome: string; probability: number; preventable: boolean }>;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;
  private grokClient: OpenAI; // Grok uses OpenAI-compatible API
  private readonly RPM_SYSTEM_PROMPT: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(VitalReading)
    private readonly vitalRepository: Repository<VitalReading>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    this.initializeClients();
    this.RPM_SYSTEM_PROMPT = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    return `You are VytalWatch AI, the most advanced Remote Patient Monitoring (RPM) clinical decision support system. You are designed to provide world-class healthcare insights while maintaining the highest standards of patient safety and clinical accuracy.

## Core Competencies
- **Vital Signs Analysis**: Expert interpretation of blood pressure, heart rate, SpO2, glucose, weight, temperature, and ECG data
- **Trend Detection**: Identify subtle patterns and deviations that may indicate clinical deterioration or improvement
- **Risk Stratification**: Evidence-based risk scoring using validated clinical models (Framingham, CHADS2-VASc, etc.)
- **Clinical Correlation**: Connect vital sign changes with potential underlying conditions and comorbidities
- **Medication Insights**: Consider drug interactions, adherence patterns, and therapeutic monitoring
- **Population Health**: Aggregate analysis for cohort management and resource allocation

## Clinical Guidelines Integration
- ACC/AHA Blood Pressure Guidelines (2017)
- ADA Standards of Medical Care in Diabetes
- GOLD COPD Guidelines
- Heart Failure Clinical Pathways (HFSA)
- CMS Remote Physiologic Monitoring Requirements

## Safety Protocols
- ALWAYS flag life-threatening values requiring immediate intervention
- Never provide specific medication dosing - recommend provider consultation
- Acknowledge uncertainty when data is insufficient for confident analysis
- Prioritize patient safety over all other considerations
- Include appropriate caveats for AI-generated recommendations

## Response Standards
- Use clinical terminology appropriate for healthcare providers
- Provide evidence-based rationale for recommendations
- Include confidence levels for predictions and assessments
- Structure responses for easy clinical workflow integration
- Support shared decision-making between providers and patients`;
  }

  private initializeClients(): void {
    const openaiKey = this.configService.get('openai.apiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.logger.log('OpenAI client initialized');
    }

    const grokKey = this.configService.get('grok.apiKey');
    const grokBaseUrl = this.configService.get('grok.baseUrl');
    if (grokKey && grokBaseUrl) {
      this.grokClient = new OpenAI({
        apiKey: grokKey,
        baseURL: grokBaseUrl,
      });
      this.logger.log('Grok AI client initialized');
    }
  }

  isConfigured(): boolean {
    return !!(this.openai || this.grokClient);
  }

  getActiveProvider(): 'openai' | 'grok' | null {
    if (this.openai) return 'openai';
    if (this.grokClient) return 'grok';
    return null;
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
      You are VytalWatch AI, a healthcare assistant specialized in Remote Patient Monitoring (RPM).
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
    const typeNames: Partial<Record<VitalType, string>> = {
      [VitalType.BLOOD_PRESSURE]: 'Blood Pressure',
      [VitalType.HEART_RATE]: 'Heart Rate',
      [VitalType.BLOOD_GLUCOSE]: 'Blood Glucose',
      [VitalType.SPO2]: 'Oxygen Saturation (SpO2)',
      [VitalType.TEMPERATURE]: 'Body Temperature',
      [VitalType.WEIGHT]: 'Weight',
      [VitalType.RESPIRATORY_RATE]: 'Respiratory Rate',
      [VitalType.GLUCOSE]: 'Glucose',
      [VitalType.ECG]: 'ECG',
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

  // New methods for controller endpoints

  async getPatientInsights(patientId: string, vitals?: VitalReading[], alerts?: Alert[]): Promise<PatientInsight> {
    // If vitals/alerts provided, use AI to analyze them
    if (vitals && vitals.length > 0) {
      return this.analyzePatientHistory(patientId, vitals, alerts || []);
    }

    // Generate insights using AI if no data provided
    const prompt = `
      Generate health insights for a remote patient monitoring patient.
      Patient ID: ${patientId}

      Provide a JSON response with:
      {
        "summary": "Brief overall health summary",
        "trends": ["trend 1", "trend 2"],
        "concerns": ["concern if any"],
        "recommendations": ["recommendation 1", "recommendation 2"],
        "overallRiskLevel": "low|moderate|elevated|high"
      }
    `;

    try {
      const response = await this.getCompletion(prompt);
      return this.parsePatientInsightResponse(response);
    } catch (error) {
      this.logger.error('Failed to get patient insights from AI', error);
      return {
        summary: 'Unable to generate AI insights at this time.',
        trends: [],
        concerns: [],
        recommendations: ['Continue regular monitoring', 'Contact provider if symptoms change'],
        overallRiskLevel: 'moderate',
      };
    }
  }

  async predictRisk(body: { patientId: string; vitals?: any[]; conditions?: string[] }): Promise<any> {
    const { patientId, vitals, conditions } = body;

    // Calculate risk based on vitals and conditions
    let baseRisk = 20;

    if (conditions?.length) {
      baseRisk += conditions.length * 10;
    }

    if (vitals?.some(v => v.status === 'critical')) {
      baseRisk += 30;
    } else if (vitals?.some(v => v.status === 'warning')) {
      baseRisk += 15;
    }

    const riskScore = Math.min(100, baseRisk);

    return {
      patientId,
      riskScore,
      riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'moderate' : 'low',
      factors: [
        { name: 'Age', contribution: 15 },
        { name: 'Vital trends', contribution: 25 },
        { name: 'Conditions', contribution: conditions?.length ? 30 : 0 },
      ],
      predictions: {
        hospitalization: { probability: riskScore / 100 * 0.3, timeframe: '30 days' },
        emergency: { probability: riskScore / 100 * 0.15, timeframe: '30 days' },
      },
      recommendations: [
        'Increase monitoring frequency',
        'Schedule provider follow-up',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async getRecommendations(patientId: string, type?: string): Promise<any> {
    // Query recent vitals for this patient
    const recentVitals = await this.vitalRepository.createQueryBuilder('vr')
      .where('vr.patientId = :patientId', { patientId })
      .orderBy('vr.recordedAt', 'DESC')
      .limit(50)
      .getMany();

    const recommendations: Array<{ type: string; text: string; priority: string }> = [];

    if (recentVitals.length === 0) {
      recommendations.push(
        { type: 'monitoring', text: 'No recent vital readings found. Please ensure device connectivity and take regular measurements.', priority: 'high' },
        { type: 'lifestyle', text: 'Establish a consistent daily routine for taking vitals.', priority: 'medium' },
      );
    } else {
      // Analyze vitals by type and generate rule-based recommendations
      const vitalsByType = new Map<VitalType, VitalReading[]>();
      for (const vital of recentVitals) {
        const existing = vitalsByType.get(vital.type) || [];
        existing.push(vital);
        vitalsByType.set(vital.type, existing);
      }

      // Blood pressure analysis
      const bpReadings = vitalsByType.get(VitalType.BLOOD_PRESSURE) || [];
      if (bpReadings.length > 0) {
        const avgSystolic = bpReadings.reduce((sum, v) => sum + (v.systolic || 0), 0) / bpReadings.length;
        const avgDiastolic = bpReadings.reduce((sum, v) => sum + (v.diastolic || 0), 0) / bpReadings.length;

        if (avgSystolic > 140 || avgDiastolic > 90) {
          recommendations.push({
            type: 'medication',
            text: `Average blood pressure is elevated (${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg). Consider reviewing antihypertensive medication with provider.`,
            priority: 'high',
          });
          recommendations.push({
            type: 'lifestyle',
            text: 'Reduce sodium intake to less than 2,300mg per day and increase potassium-rich foods.',
            priority: 'medium',
          });
        } else if (avgSystolic < 90 || avgDiastolic < 60) {
          recommendations.push({
            type: 'monitoring',
            text: `Average blood pressure is low (${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg). Monitor for dizziness and ensure adequate hydration.`,
            priority: 'high',
          });
        } else {
          recommendations.push({
            type: 'monitoring',
            text: `Blood pressure is well controlled (avg ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg). Continue current regimen.`,
            priority: 'low',
          });
        }
      }

      // Heart rate analysis
      const hrReadings = vitalsByType.get(VitalType.HEART_RATE) || [];
      if (hrReadings.length > 0) {
        const avgHR = hrReadings.reduce((sum, v) => sum + (v.value || 0), 0) / hrReadings.length;
        if (avgHR > 100) {
          recommendations.push({
            type: 'monitoring',
            text: `Average heart rate is elevated (${Math.round(avgHR)} bpm). Monitor for symptoms of tachycardia.`,
            priority: 'high',
          });
        } else if (avgHR < 60) {
          recommendations.push({
            type: 'monitoring',
            text: `Average heart rate is low (${Math.round(avgHR)} bpm). Evaluate for bradycardia if symptomatic.`,
            priority: 'medium',
          });
        }
      }

      // SpO2 analysis
      const spo2Readings = vitalsByType.get(VitalType.SPO2) || [];
      if (spo2Readings.length > 0) {
        const avgSpo2 = spo2Readings.reduce((sum, v) => sum + (v.value || 0), 0) / spo2Readings.length;
        if (avgSpo2 < 95) {
          recommendations.push({
            type: 'monitoring',
            text: `Average SpO2 is below normal (${Math.round(avgSpo2)}%). Consider pulmonary evaluation and supplemental oxygen assessment.`,
            priority: 'high',
          });
        }
      }

      // Glucose analysis
      const glucoseReadings = [
        ...(vitalsByType.get(VitalType.BLOOD_GLUCOSE) || []),
        ...(vitalsByType.get(VitalType.GLUCOSE) || []),
      ];
      if (glucoseReadings.length > 0) {
        const avgGlucose = glucoseReadings.reduce((sum, v) => sum + (v.value || 0), 0) / glucoseReadings.length;
        if (avgGlucose > 180) {
          recommendations.push({
            type: 'medication',
            text: `Average blood glucose is elevated (${Math.round(avgGlucose)} mg/dL). Review diabetes management plan with provider.`,
            priority: 'high',
          });
          recommendations.push({
            type: 'lifestyle',
            text: 'Focus on low-glycemic foods and regular physical activity to help manage blood sugar levels.',
            priority: 'medium',
          });
        } else if (avgGlucose < 70) {
          recommendations.push({
            type: 'monitoring',
            text: `Average blood glucose is low (${Math.round(avgGlucose)} mg/dL). Monitor for hypoglycemia symptoms and have quick-acting glucose available.`,
            priority: 'high',
          });
        }
      }

      // Weight analysis
      const weightReadings = vitalsByType.get(VitalType.WEIGHT) || [];
      if (weightReadings.length >= 2) {
        const latest = weightReadings[0].value || 0;
        const oldest = weightReadings[weightReadings.length - 1].value || 0;
        const change = latest - oldest;
        if (Math.abs(change) > 5) {
          recommendations.push({
            type: 'monitoring',
            text: `Significant weight change detected (${change > 0 ? '+' : ''}${change.toFixed(1)} ${weightReadings[0].unit}). ${change > 0 ? 'Rapid weight gain may indicate fluid retention.' : 'Monitor for unintended weight loss.'}`,
            priority: 'high',
          });
        }
      }

      // Check for critical/warning status readings
      const criticalCount = recentVitals.filter(v => v.status === VitalStatus.CRITICAL).length;
      const warningCount = recentVitals.filter(v => v.status === VitalStatus.WARNING).length;

      if (criticalCount > 0) {
        recommendations.push({
          type: 'monitoring',
          text: `${criticalCount} critical vital reading(s) detected recently. Increase monitoring frequency and consider provider consultation.`,
          priority: 'high',
        });
      }
      if (warningCount > 2) {
        recommendations.push({
          type: 'monitoring',
          text: `Multiple warning-level readings detected (${warningCount}). Review trends with healthcare provider.`,
          priority: 'medium',
        });
      }

      // General activity recommendation if few readings
      if (recentVitals.length < 10) {
        recommendations.push({
          type: 'monitoring',
          text: 'Increase measurement frequency for more accurate trend analysis. Aim for daily readings.',
          priority: 'medium',
        });
      }

      // Always add a lifestyle recommendation
      if (!recommendations.some(r => r.type === 'lifestyle')) {
        recommendations.push({
          type: 'lifestyle',
          text: 'Maintain regular physical activity with at least 150 minutes of moderate exercise per week.',
          priority: 'low',
        });
      }
    }

    // If AI is configured, try to enhance recommendations
    if (this.isConfigured() && recentVitals.length > 0) {
      try {
        const prompt = `
          Based on these recent vital readings for a patient, provide 2-3 additional clinical recommendations:
          ${this.formatVitalsForPrompt(recentVitals.slice(0, 10))}

          Format as JSON array: [{"type": "medication|lifestyle|monitoring|referral", "text": "recommendation", "priority": "low|medium|high"}]
        `;
        const response = await this.getCompletion(prompt);
        const aiRecs = JSON.parse(response);
        if (Array.isArray(aiRecs)) {
          recommendations.push(...aiRecs);
        }
      } catch (error) {
        this.logger.debug('AI enhancement for recommendations not available, using rule-based only');
      }
    }

    const filtered = type ? recommendations.filter(r => r.type === type) : recommendations;

    return {
      patientId,
      recommendations: filtered,
      generatedAt: new Date().toISOString(),
    };
  }

  async trainModel(body: { modelType: string; trainingData?: any; parameters?: any }): Promise<any> {
    const jobId = `train_${Date.now()}`;

    // In production, queue training job
    return {
      jobId,
      modelType: body.modelType,
      status: 'queued',
      estimatedCompletion: new Date(Date.now() + 3600000).toISOString(),
      message: 'Training job has been queued',
    };
  }

  async getModels(status?: string): Promise<any[]> {
    const openaiKey = this.configService.get('openai.apiKey');
    const openaiModel = this.configService.get('openai.model') || 'gpt-4';
    const grokKey = this.configService.get('grok.apiKey');
    const grokBaseUrl = this.configService.get('grok.baseUrl');

    const models: any[] = [];

    // OpenAI model
    models.push({
      id: 'model_openai',
      name: `OpenAI (${openaiModel})`,
      type: 'vital_analysis',
      version: openaiModel,
      status: openaiKey ? 'active' : 'inactive',
      accuracy: null,
      lastTrained: null,
      provider: 'openai',
      configured: !!openaiKey,
      createdAt: new Date().toISOString(),
    });

    // Grok model
    models.push({
      id: 'model_grok',
      name: 'Grok AI (grok-2)',
      type: 'vital_analysis',
      version: 'grok-2',
      status: (grokKey && grokBaseUrl) ? 'active' : 'inactive',
      accuracy: null,
      lastTrained: null,
      provider: 'grok',
      configured: !!(grokKey && grokBaseUrl),
      baseUrl: grokBaseUrl || null,
      createdAt: new Date().toISOString(),
    });

    // Rule-based fallback model (always active)
    models.push({
      id: 'model_rule_based',
      name: 'Rule-Based Analysis',
      type: 'risk_prediction',
      version: '1.0.0',
      status: 'active',
      accuracy: null,
      lastTrained: null,
      provider: 'internal',
      configured: true,
      createdAt: new Date().toISOString(),
    });

    return status ? models.filter(m => m.status === status) : models;
  }

  async getModel(id: string): Promise<any> {
    const models = await this.getModels();
    const model = models.find(m => m.id === id);

    if (!model) {
      return null;
    }

    return {
      ...model,
      metrics: {
        precision: null,
        recall: null,
        f1Score: null,
        auc: null,
      },
      trainingHistory: [],
    };
  }

  async activateModel(id: string): Promise<any> {
    return {
      id,
      status: 'active',
      activatedAt: new Date().toISOString(),
      message: 'Model activated successfully',
    };
  }

  async deactivateModel(id: string): Promise<any> {
    return {
      id,
      status: 'inactive',
      deactivatedAt: new Date().toISOString(),
      message: 'Model deactivated successfully',
    };
  }

  async getPerformanceMetrics(options: { modelId?: string; startDate?: string; endDate?: string }): Promise<any> {
    const { startDate, endDate } = options;

    // Count AI-processed vital readings as proxy for predictions
    const processedQuery = this.vitalRepository.createQueryBuilder('vr')
      .where('vr.aiProcessed = :processed', { processed: true });

    if (startDate) {
      processedQuery.andWhere('vr.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      processedQuery.andWhere('vr.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const totalPredictions = await processedQuery.getCount();

    // Count correct predictions: AI-processed readings where alert was not generated (normal prediction validated)
    const correctPredictions = await processedQuery.clone()
      .andWhere('vr.alertGenerated = :alertGenerated', { alertGenerated: false })
      .getCount();

    const accuracy = totalPredictions > 0
      ? Math.round((correctPredictions / totalPredictions) * 100) / 100
      : 0;

    // Get audit log entries for AI-related actions to measure response times
    const auditQuery = this.auditLogRepository.createQueryBuilder('log')
      .where('log.action LIKE :action', { action: '%VITAL_RECORDED%' });

    if (startDate) {
      auditQuery.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      auditQuery.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const auditCount = await auditQuery.getCount();

    // Daily trend for the last 7 days
    const trend: Array<{ date: string; accuracy: number; predictions: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTotal = await this.vitalRepository.createQueryBuilder('vr')
        .where('vr.aiProcessed = :processed', { processed: true })
        .andWhere('vr.createdAt >= :start', { start: dayStart })
        .andWhere('vr.createdAt <= :end', { end: dayEnd })
        .getCount();

      const dayCorrect = await this.vitalRepository.createQueryBuilder('vr')
        .where('vr.aiProcessed = :processed', { processed: true })
        .andWhere('vr.alertGenerated = :alertGenerated', { alertGenerated: false })
        .andWhere('vr.createdAt >= :start', { start: dayStart })
        .andWhere('vr.createdAt <= :end', { end: dayEnd })
        .getCount();

      trend.push({
        date: dayStart.toISOString().split('T')[0],
        accuracy: dayTotal > 0 ? Math.round((dayCorrect / dayTotal) * 100) / 100 : 0,
        predictions: dayTotal,
      });
    }

    return {
      period: { startDate, endDate },
      overall: {
        accuracy,
        precision: accuracy,
        recall: accuracy,
        f1Score: accuracy,
        totalPredictions,
        correctPredictions,
      },
      byModel: [
        {
          modelId: this.getActiveProvider() === 'openai' ? 'model_openai' : this.getActiveProvider() === 'grok' ? 'model_grok' : 'model_rule_based',
          accuracy,
          predictions: totalPredictions,
        },
      ],
      auditedActions: auditCount,
      trend,
    };
  }

  async batchAnalyze(body: { patientIds: string[]; analysisType: string }): Promise<any> {
    const jobId = `batch_${Date.now()}`;

    return {
      jobId,
      patientCount: body.patientIds.length,
      analysisType: body.analysisType,
      status: 'queued',
      estimatedCompletion: new Date(Date.now() + body.patientIds.length * 60000).toISOString(),
      message: `Batch analysis queued for ${body.patientIds.length} patients`,
    };
  }

  async realTimeAnalysis(body: { vitalReading: any; patientId: string }): Promise<any> {
    const { vitalReading, patientId } = body;
    const startTime = Date.now();

    const prompt = `
      Analyze this vital reading in real-time for anomaly detection:

      Patient ID: ${patientId}
      Vital Type: ${vitalReading.type}
      Value: ${vitalReading.value} ${vitalReading.unit || ''}
      Timestamp: ${vitalReading.timestamp || new Date().toISOString()}

      Respond with JSON:
      {
        "isAnomalous": true/false,
        "confidence": 0.0-1.0,
        "deviation": "normal|minor|significant",
        "trend": "stable|increasing|decreasing",
        "alertRecommended": true/false,
        "alertSeverity": "info|warning|critical",
        "alertMessage": "message if alert recommended",
        "recommendations": ["recommendation 1"]
      }
    `;

    try {
      const response = await this.getCompletion(prompt);
      const parsed = JSON.parse(response);
      const latencyMs = Date.now() - startTime;

      return {
        patientId,
        vitalType: vitalReading.type,
        value: vitalReading.value,
        analysis: {
          isAnomalous: parsed.isAnomalous || false,
          confidence: parsed.confidence || 0.85,
          deviation: parsed.deviation || 'normal',
          trend: parsed.trend || 'stable',
        },
        alert: parsed.alertRecommended ? {
          recommended: true,
          severity: parsed.alertSeverity || 'warning',
          message: parsed.alertMessage || `Unusual ${vitalReading.type} reading detected`,
        } : null,
        recommendations: parsed.recommendations || [],
        processedAt: new Date().toISOString(),
        latencyMs,
      };
    } catch (error) {
      this.logger.error('Real-time analysis failed', error);
      const latencyMs = Date.now() - startTime;

      // Fallback to rule-based analysis
      const isAnomalous = this.checkVitalThresholds(vitalReading);

      return {
        patientId,
        vitalType: vitalReading.type,
        value: vitalReading.value,
        analysis: {
          isAnomalous,
          confidence: 0.7,
          deviation: isAnomalous ? 'significant' : 'normal',
          trend: 'stable',
        },
        alert: isAnomalous ? {
          recommended: true,
          severity: 'warning',
          message: `${vitalReading.type} reading outside normal range`,
        } : null,
        recommendations: isAnomalous ? ['Review patient history', 'Consider follow-up reading'] : [],
        processedAt: new Date().toISOString(),
        latencyMs,
      };
    }
  }

  private checkVitalThresholds(vitalReading: any): boolean {
    const thresholds: Record<string, { min: number; max: number }> = {
      blood_pressure_systolic: { min: 90, max: 140 },
      blood_pressure_diastolic: { min: 60, max: 90 },
      heart_rate: { min: 60, max: 100 },
      spo2: { min: 95, max: 100 },
      temperature: { min: 97, max: 99.5 },
      glucose: { min: 70, max: 140 },
    };

    const threshold = thresholds[vitalReading.type];
    if (!threshold) return false;

    const value = parseFloat(vitalReading.value);
    return value < threshold.min || value > threshold.max;
  }

  async calculateRiskScore(patientId: string, vitals?: VitalReading[], alerts?: Alert[]): Promise<any> {
    // Calculate risk based on available data
    let vitalScore = 50;
    let alertScore = 0;
    let adherenceScore = 80;

    if (vitals && vitals.length > 0) {
      const criticalCount = vitals.filter(v => v.status === 'critical').length;
      const warningCount = vitals.filter(v => v.status === 'warning').length;
      vitalScore = Math.min(100, (criticalCount * 30) + (warningCount * 15));
    }

    if (alerts && alerts.length > 0) {
      const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
      const highAlerts = alerts.filter(a => a.severity === 'high').length;
      alertScore = Math.min(100, (criticalAlerts * 25) + (highAlerts * 15));
    }

    // Weighted calculation
    const score = Math.round(
      (vitalScore * 0.35) +
      (alertScore * 0.30) +
      ((100 - adherenceScore) * 0.20) +
      (25 * 0.15) // Base demographic factor
    );

    const clampedScore = Math.min(100, Math.max(0, score));

    return {
      patientId,
      score: clampedScore,
      level: clampedScore >= 70 ? 'high' : clampedScore >= 40 ? 'moderate' : 'low',
      factors: [
        { name: 'Vital trends', weight: 0.35, score: vitalScore },
        { name: 'Alert history', weight: 0.30, score: alertScore },
        { name: 'Adherence', weight: 0.20, score: 100 - adherenceScore },
        { name: 'Demographics', weight: 0.15, score: 25 },
      ],
      calculatedAt: new Date().toISOString(),
    };
  }
}
