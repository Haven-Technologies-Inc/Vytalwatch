import { Test, TestingModule } from '@nestjs/testing';
import { RiskScoringService } from './risk-scoring.service';

describe('RiskScoringService', () => {
  let service: RiskScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskScoringService],
    }).compile();
    service = module.get<RiskScoringService>(RiskScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRiskScore', () => {
    it('should return LOW risk for healthy vitals', () => {
      const vitals = [{ type: 'BLOOD_PRESSURE', value: 120, status: 'normal', timestamp: new Date() }];
      const alerts: any[] = [];
      const result = service.calculateRiskScore(vitals as any, alerts);
      expect(result.riskLevel).toBe('LOW');
      expect(result.overallScore).toBeLessThan(25);
    });

    it('should return HIGH risk for multiple critical alerts', () => {
      const vitals: any[] = [];
      const alerts = [
        { severity: 'critical', type: 'BP_HIGH' },
        { severity: 'critical', type: 'BP_HIGH' },
        { severity: 'critical', type: 'BP_HIGH' },
        { severity: 'critical', type: 'BP_HIGH' },
      ];
      const result = service.calculateRiskScore(vitals, alerts as any);
      expect(['HIGH', 'CRITICAL']).toContain(result.riskLevel);
    });

    it('should include age factor when provided', () => {
      const result = service.calculateRiskScore([], [], 70);
      const ageFactor = result.factors.find(f => f.name === 'Age Factor');
      expect(ageFactor).toBeDefined();
      expect(ageFactor?.score).toBeGreaterThan(20);
    });

    it('should provide recommendations based on risk level', () => {
      const result = service.calculateRiskScore([], []);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should include predictions', () => {
      const result = service.calculateRiskScore([], []);
      expect(result.predictions).toBeDefined();
    });
  });
});
