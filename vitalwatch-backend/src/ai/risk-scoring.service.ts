import { Injectable } from '@nestjs/common';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { Alert } from '../alerts/entities/alert.entity';

export interface RiskScore { overallScore: number; riskLevel: 'LOW'|'MODERATE'|'HIGH'|'CRITICAL'; factors: { name: string; score: number; weight: number }[]; predictions: { event: string; probability: number; preventable: boolean }[]; recommendations: string[]; confidence: number; }

@Injectable()
export class RiskScoringService {
  calculateRiskScore(vitals: VitalReading[], alerts: Alert[], age?: number): RiskScore {
    const factors = [];
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const recentVitals = vitals.slice(-30);
    
    factors.push({ name: 'Alert History', score: Math.min(100, criticalAlerts * 15), weight: 0.3 });
    factors.push({ name: 'Vital Compliance', score: Math.max(0, 100 - (30 - recentVitals.length) * 3), weight: 0.2 });
    factors.push({ name: 'Trend Analysis', score: this.analyzeTrends(recentVitals), weight: 0.3 });
    if (age) factors.push({ name: 'Age Factor', score: age > 65 ? 40 : age > 50 ? 20 : 10, weight: 0.2 });

    const total = factors.reduce((s, f) => s + f.score * f.weight, 0) / factors.reduce((s, f) => s + f.weight, 0);
    const score = Math.round(total);
    const level = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW';

    return { overallScore: score, riskLevel: level, factors, predictions: this.getPredictions(level), recommendations: this.getRecommendations(level), confidence: Math.min(95, 60 + recentVitals.length) };
  }

  private analyzeTrends(vitals: VitalReading[]): number {
    if (!vitals.length) return 50;
    const outOfRange = vitals.filter(v => v.status !== 'normal').length;
    return Math.min(100, (outOfRange / vitals.length) * 100);
  }

  private getPredictions(level: string): { event: string; probability: number; preventable: boolean }[] {
    const base = [{ event: 'Hospital Readmission', probability: level === 'CRITICAL' ? 0.45 : level === 'HIGH' ? 0.25 : 0.1, preventable: true }];
    if (level === 'CRITICAL' || level === 'HIGH') base.push({ event: 'ER Visit', probability: level === 'CRITICAL' ? 0.6 : 0.3, preventable: true });
    return base;
  }

  private getRecommendations(level: string): string[] {
    if (level === 'CRITICAL') return ['Immediate provider review', 'Consider medication adjustment', 'Increase monitoring frequency'];
    if (level === 'HIGH') return ['Schedule follow-up within 48 hours', 'Review compliance barriers', 'Patient education session'];
    return ['Continue current monitoring', 'Reinforce healthy habits'];
  }
}
