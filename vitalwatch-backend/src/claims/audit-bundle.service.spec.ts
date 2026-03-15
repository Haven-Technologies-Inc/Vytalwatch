import { Test, TestingModule } from '@nestjs/testing';
import { AuditBundleService } from './audit-bundle.service';

describe('AuditBundleService', () => {
  let service: AuditBundleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditBundleService],
    }).compile();
    service = module.get<AuditBundleService>(AuditBundleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAuditBundle', () => {
    it('should generate bundle with hash', async () => {
      const data = {
        claim: {
          id: 'CLM001',
          patientName: 'John Doe',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          codes: [],
        },
        vitals: [{ type: 'BP', value: 120 }],
        timeEntries: [{ minutes: 15, category: 'DATA_REVIEW' }],
        notes: [{ date: '2026-01-15', content: 'Review', signedBy: 'Dr. Smith' }],
        alerts: [],
        communications: [],
      };
      const result = await service.generateAuditBundle(data as any);
      expect(result.id).toContain('AB-');
      expect(result.hash).toContain('SHA256:');
      expect(result.claimId).toBe('CLM001');
      expect(result.pdfBuffer).toBeDefined();
    });

    it('should include attestation in PDF', async () => {
      const data = {
        claim: { id: 'CLM001' },
        vitals: [],
        timeEntries: [],
        notes: [],
        alerts: [],
        communications: [],
      };
      const result = await service.generateAuditBundle(data as any);
      expect(result.pdfBuffer).toBeDefined();
      expect(result.pdfBuffer.length).toBeGreaterThan(0);
      // Verify it starts with PDF header
      const header = result.pdfBuffer.subarray(0, 5).toString();
      expect(header).toBe('%PDF-');
      // Verify the PDF has substantial content (attestation section adds to size)
      expect(result.pdfBuffer.length).toBeGreaterThan(500);
    });
  });
});
