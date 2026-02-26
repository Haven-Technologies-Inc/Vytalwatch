import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChartingAssistantService } from './charting-assistant.service';

describe('ChartingAssistantService', () => {
  let service: ChartingAssistantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChartingAssistantService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(null) } },
      ],
    }).compile();
    service = module.get<ChartingAssistantService>(ChartingAssistantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSOAPNote', () => {
    it('should return default SOAP when AI unavailable', async () => {
      const context = {
        patientId: '123', patientName: 'John Doe', programType: 'BP' as const,
        periodStart: new Date(), periodEnd: new Date(),
        vitals: [], alerts: [], communications: [], totalMinutes: 25, readingDays: 18,
      };
      const result = await service.generateSOAPNote(context);
      expect(result).toHaveProperty('subjective');
      expect(result).toHaveProperty('objective');
      expect(result).toHaveProperty('assessment');
      expect(result).toHaveProperty('plan');
      expect(result.cptCodes).toContain('99457');
    });
  });
});
