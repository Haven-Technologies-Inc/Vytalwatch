import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { CommunicationLog } from '../clinical-notes/entities/clinical-note.entity';

export interface ChartingContext {
  patientId: string;
  patientName: string;
  programType: 'BP' | 'GLUCOSE' | 'WEIGHT' | 'MULTI';
  periodStart: Date;
  periodEnd: Date;
  vitals: VitalReading[];
  alerts: Alert[];
  communications: CommunicationLog[];
  totalMinutes: number;
  readingDays: number;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes: string[];
  cptCodes: string[];
  billingJustification: string;
}

export interface TriageSummary {
  priority: 'ROUTINE' | 'SOON' | 'URGENT' | 'STAT';
  summary: string;
  keyFindings: string[];
  recommendedActions: string[];
  escalationNeeded: boolean;
  escalationReason?: string;
}

export interface OutreachScript {
  greeting: string;
  healthCheckQuestions: string[];
  educationPoints: string[];
  closingStatements: string[];
  documentationTemplate: string;
}

@Injectable()
export class ChartingAssistantService {
  private readonly logger = new Logger(ChartingAssistantService.name);
  private client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get('openai.apiKey') || this.config.get('grok.apiKey');
    const baseURL = this.config.get('grok.baseUrl');
    if (apiKey) {
      this.client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
    }
  }

  async generateSOAPNote(context: ChartingContext): Promise<SOAPNote> {
    const prompt = this.buildSOAPPrompt(context);
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.get('openai.model') || 'gpt-4',
        messages: [{ role: 'system', content: this.getChartingSystemPrompt() }, { role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (e) {
      this.logger.error('SOAP generation failed', e);
      return this.getDefaultSOAP(context);
    }
  }

  async generateTriageSummary(context: ChartingContext): Promise<TriageSummary> {
    const prompt = `Analyze RPM data and generate triage summary:\n${JSON.stringify({ vitals: context.vitals.slice(-20), alerts: context.alerts.slice(-10) })}\nReturn JSON: {priority,summary,keyFindings[],recommendedActions[],escalationNeeded,escalationReason?}`;
    try {
      const res = await this.client.chat.completions.create({
        model: this.config.get('openai.model') || 'gpt-4',
        messages: [{ role: 'system', content: 'You are a clinical triage AI. Analyze RPM data and prioritize based on clinical urgency.' }, { role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content || '{}');
    } catch (e) {
      this.logger.error('Triage generation failed', e);
      return { priority: 'ROUTINE', summary: 'Unable to generate summary', keyFindings: [], recommendedActions: [], escalationNeeded: false };
    }
  }

  async generateOutreachScript(context: ChartingContext, reason: string): Promise<OutreachScript> {
    const prompt = `Generate patient outreach script for ${reason}. Patient: ${context.patientName}, Program: ${context.programType}. Recent concerns: ${context.alerts.slice(-3).map(a => a.message).join('; ')}`;
    try {
      const res = await this.client.chat.completions.create({
        model: this.config.get('openai.model') || 'gpt-4',
        messages: [{ role: 'system', content: 'Generate empathetic, professional patient outreach scripts for RPM programs.' }, { role: 'user', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(res.choices[0].message.content || '{}');
    } catch (e) {
      this.logger.error('Outreach script generation failed', e);
      return { greeting: '', healthCheckQuestions: [], educationPoints: [], closingStatements: [], documentationTemplate: '' };
    }
  }

  private buildSOAPPrompt(ctx: ChartingContext): string {
    const vitalsSummary = this.summarizeVitals(ctx.vitals);
    return `Generate comprehensive SOAP note for RPM monthly summary.
Patient: ${ctx.patientName} | Program: ${ctx.programType}
Period: ${ctx.periodStart.toISOString().split('T')[0]} to ${ctx.periodEnd.toISOString().split('T')[0]}
Reading Days: ${ctx.readingDays} | Total Time: ${ctx.totalMinutes} min
Vitals Summary: ${vitalsSummary}
Alerts: ${ctx.alerts.length} total, ${ctx.alerts.filter(a => a.severity === 'critical').length} critical
Communications: ${ctx.communications.length} logged interactions
Return JSON: {subjective,objective,assessment,plan,icd10Codes[],cptCodes[],billingJustification}`;
  }

  private summarizeVitals(vitals: VitalReading[]): string {
    if (!vitals.length) return 'No vitals recorded';
    const byType = vitals.reduce((acc, v) => { acc[v.type] = (acc[v.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(byType).map(([t, c]) => `${t}: ${c} readings`).join(', ');
  }

  private getChartingSystemPrompt(): string {
    return `You are a clinical documentation AI specializing in RPM SOAP notes. Generate accurate, billable documentation following CMS guidelines. Include appropriate ICD-10 and CPT codes. Ensure medical necessity is clearly documented.`;
  }

  private getDefaultSOAP(ctx: ChartingContext): SOAPNote {
    return {
      subjective: `Patient enrolled in ${ctx.programType} RPM program. ${ctx.readingDays} days of readings recorded.`,
      objective: `${ctx.vitals.length} vital readings reviewed. ${ctx.alerts.length} alerts generated.`,
      assessment: 'Remote monitoring data reviewed. Patient compliance noted.',
      plan: 'Continue RPM monitoring. Follow up as needed.',
      icd10Codes: ['Z96.89'],
      cptCodes: ctx.totalMinutes >= 20 ? ['99457'] : ['99454'],
      billingJustification: `${ctx.totalMinutes} minutes of clinical staff time documented.`,
    };
  }
}
