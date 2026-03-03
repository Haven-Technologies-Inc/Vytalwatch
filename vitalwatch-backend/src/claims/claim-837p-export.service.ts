import { Injectable, Logger } from '@nestjs/common';
import { Claim } from '../claims/entities/claim.entity';

export interface EDI837PSegment { segmentId: string; elements: string[]; }
export interface EDI837PFile { content: string; filename: string; claimIds: string[]; totalCharges: number; }

@Injectable()
export class Claim837PExportService {
  private readonly logger = new Logger(Claim837PExportService.name);
  private isaControlNumber = 1;
  private gsControlNumber = 1;

  generateEDI837P(claims: Claim[], submitterInfo: { name: string; ein: string; npi: string }, receiverInfo: { name: string; id: string }): EDI837PFile {
    const segments: EDI837PSegment[] = [];
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 16).replace(':', '');

    segments.push({ segmentId: 'ISA', elements: ['00', '          ', '00', '          ', 'ZZ', submitterInfo.ein.padEnd(15), 'ZZ', receiverInfo.id.padEnd(15), date.slice(2), time, '^', '00501', String(this.isaControlNumber++).padStart(9, '0'), '0', 'P', ':'] });
    segments.push({ segmentId: 'GS', elements: ['HC', submitterInfo.ein, receiverInfo.id, date, time, String(this.gsControlNumber++), 'X', '005010X222A1'] });
    segments.push({ segmentId: 'ST', elements: ['837', '0001', '005010X222A1'] });
    segments.push({ segmentId: 'BHT', elements: ['0019', '00', 'RPM' + Date.now(), date, time, 'CH'] });
    segments.push({ segmentId: 'NM1', elements: ['41', '2', submitterInfo.name, '', '', '', '', '46', submitterInfo.ein] });
    segments.push({ segmentId: 'NM1', elements: ['40', '2', receiverInfo.name, '', '', '', '', '46', receiverInfo.id] });

    let claimNum = 0;
    let totalCharges = 0;
    claims.forEach(claim => {
      claimNum++;
      const charges = claim.codes?.reduce((s, c) => s + (c.charge || 0), 0) || 0;
      totalCharges += charges;
      segments.push({ segmentId: 'HL', elements: [String(claimNum), '', '22', '1'] });
      segments.push({ segmentId: 'NM1', elements: ['85', '2', claim.providerName || 'Provider', '', '', '', '', 'XX', claim.providerNpi || ''] });
      segments.push({ segmentId: 'NM1', elements: ['QC', '1', claim.patientName?.split(' ')[1] || '', claim.patientName?.split(' ')[0] || ''] });
      segments.push({ segmentId: 'CLM', elements: [claim.id, String(charges), '', '', '11:B:1', 'Y', 'A', 'Y', 'Y'] });
      claim.codes?.forEach((code, i) => segments.push({ segmentId: 'SV1', elements: ['HC:' + code.code, String(code.charge || 0), 'UN', '1', '', '', '1'] }));
    });

    segments.push({ segmentId: 'SE', elements: [String(segments.length + 1), '0001'] });
    segments.push({ segmentId: 'GE', elements: ['1', String(this.gsControlNumber - 1)] });
    segments.push({ segmentId: 'IEA', elements: ['1', String(this.isaControlNumber - 1).padStart(9, '0')] });

    const content = segments.map(s => s.segmentId + '*' + s.elements.join('*') + '~').join('\n');
    return { content, filename: `837P_${date}_${time}.edi`, claimIds: claims.map(c => c.id), totalCharges };
  }
}
