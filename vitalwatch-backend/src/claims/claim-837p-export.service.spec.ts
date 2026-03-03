import { Test, TestingModule } from '@nestjs/testing';
import { Claim837PExportService } from './claim-837p-export.service';

describe('Claim837PExportService', () => {
  let service: Claim837PExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Claim837PExportService],
    }).compile();
    service = module.get<Claim837PExportService>(Claim837PExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEDI837P', () => {
    it('should generate valid EDI content', () => {
      const claims = [{ id: 'CLM001', patientName: 'John Doe', codes: [{ code: '99457', charge: 50 }] }];
      const submitter = { name: 'Test Clinic', ein: '123456789', npi: '1234567890' };
      const receiver = { name: 'Test Payer', id: 'PAYER01' };
      const result = service.generateEDI837P(claims as any, submitter, receiver);
      expect(result.content).toContain('ISA*');
      expect(result.content).toContain('GS*HC');
      expect(result.content).toContain('ST*837');
      expect(result.content).toContain('CLM*');
      expect(result.content).toContain('IEA*');
      expect(result.claimIds).toContain('CLM001');
    });

    it('should calculate total charges', () => {
      const claims = [
        { id: 'CLM001', codes: [{ code: '99457', charge: 50 }, { code: '99458', charge: 40 }] },
        { id: 'CLM002', codes: [{ code: '99454', charge: 60 }] },
      ];
      const result = service.generateEDI837P(claims as any, { name: 'A', ein: 'B', npi: 'C' }, { name: 'D', id: 'E' });
      expect(result.totalCharges).toBe(150);
    });
  });
});
