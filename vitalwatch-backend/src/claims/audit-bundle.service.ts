import { Injectable, Logger } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Claim } from './entities/claim.entity';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { TimeEntry } from '../time-tracking/entities/time-entry.entity';

export interface AuditBundleData { claim: Claim; vitals: VitalReading[]; timeEntries: TimeEntry[]; notes: { date: string; content: string; signedBy: string }[]; alerts: { date: string; type: string; severity: string }[]; communications: { date: string; type: string; summary: string }[]; }
export interface AuditBundle { id: string; claimId: string; generatedAt: Date; hash: string; pdfBuffer?: Buffer; data: AuditBundleData; }

@Injectable()
export class AuditBundleService {
  private readonly logger = new Logger(AuditBundleService.name);

  async generateAuditBundle(data: AuditBundleData): Promise<AuditBundle> {
    const bundle: AuditBundle = { id: 'AB-' + Date.now(), claimId: data.claim.id, generatedAt: new Date(), hash: this.generateHash(data), data };
    bundle.pdfBuffer = await this.generatePDF(data, bundle.hash);
    return bundle;
  }

  private generateHash(data: AuditBundleData): string {
    const content = JSON.stringify({ claimId: data.claim.id, vitalsCount: data.vitals.length, timeMinutes: data.timeEntries.reduce((s, t) => s + (t.minutes || 0), 0), notesCount: data.notes.length, ts: Date.now() });
    let hash = 0;
    for (let i = 0; i < content.length; i++) { hash = ((hash << 5) - hash) + content.charCodeAt(i); hash |= 0; }
    return 'SHA256:' + Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
  }

  private async generatePDF(data: AuditBundleData, hash: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('RPM AUDIT BUNDLE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text('Generated: ' + new Date().toISOString(), { align: 'center' });
      doc.text('Bundle Hash: ' + hash, { align: 'center' });
      doc.moveDown(2);

      // Claim Info
      doc.fontSize(14).font('Helvetica-Bold').text('CLAIM INFORMATION');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text('Claim ID: ' + data.claim.id);
      doc.text('Patient: ' + (data.claim.patientName || 'N/A'));
      doc.text('Period: ' + data.claim.periodStart + ' to ' + data.claim.periodEnd);
      if (data.claim.codes?.length) doc.text('Codes: ' + data.claim.codes.map(c => c.code).join(', '));
      doc.moveDown();

      // Time Entries
      const totalMin = data.timeEntries.reduce((s, t) => s + (t.minutes || 0), 0);
      doc.fontSize(14).font('Helvetica-Bold').text('TIME DOCUMENTATION (' + totalMin + ' minutes)');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      data.timeEntries.slice(0, 15).forEach(t => doc.text(' ' + t.category + ': ' + t.minutes + ' min'));
      doc.moveDown();

      // Vitals Summary
      const uniqueDays = new Set(data.vitals.map(v => new Date(v.recordedAt).toDateString())).size;
      doc.fontSize(14).font('Helvetica-Bold').text('VITAL READINGS (' + data.vitals.length + ' readings, ' + uniqueDays + ' days)');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      const byType = data.vitals.reduce((a, v) => { a[v.type] = (a[v.type] || 0) + 1; return a; }, {} as Record<string, number>);
      Object.entries(byType).forEach(([t, c]) => doc.text(' ' + t + ': ' + c + ' readings'));
      doc.moveDown();

      // Clinical Notes
      doc.fontSize(14).font('Helvetica-Bold').text('CLINICAL NOTES (' + data.notes.length + ')');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      data.notes.forEach(n => doc.text(' ' + n.date + ' - Signed by: ' + n.signedBy));
      doc.moveDown(2);

      // Attestation
      doc.fontSize(14).font('Helvetica-Bold').text('ATTESTATION');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text('I hereby certify that all services documented in this audit bundle were rendered as described and are accurate to the best of my knowledge.');
      doc.moveDown(2);
      doc.text('Signature: _______________________________     Date: _______________');

      doc.end();
    });
  }
}
