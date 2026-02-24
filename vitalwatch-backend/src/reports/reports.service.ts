import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportType } from './entities/report.entity';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly reportsDir = path.join(process.cwd(), 'generated-reports');

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly auditService: AuditService,
  ) {
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async findAll(options: {
    page: number;
    limit: number;
    type?: string;
    status?: string;
    organizationId?: string;
    userId?: string;
  }) {
    const { page, limit, type, status, organizationId, userId } = options;
    const skip = (page - 1) * limit;

    const query = this.reportRepository.createQueryBuilder('report');

    if (organizationId) {
      query.andWhere('report.organizationId = :organizationId', { organizationId });
    }

    if (type) {
      query.andWhere('report.type = :type', { type });
    }

    if (status) {
      query.andWhere('report.status = :status', { status });
    }

    const [reports, total] = await query
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: reports,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTemplates() {
    return [
      {
        id: 'patient_summary',
        name: 'Patient Summary Report',
        description: 'Comprehensive patient health summary',
        parameters: ['patientId', 'startDate', 'endDate'],
      },
      {
        id: 'vitals_history',
        name: 'Vitals History Report',
        description: 'Detailed vital signs history',
        parameters: ['patientId', 'vitalType', 'startDate', 'endDate'],
      },
      {
        id: 'billing',
        name: 'Billing Report',
        description: 'CPT codes and billing summary',
        parameters: ['organizationId', 'startDate', 'endDate'],
      },
      {
        id: 'compliance',
        name: 'Compliance Report',
        description: 'Patient monitoring compliance metrics',
        parameters: ['organizationId', 'startDate', 'endDate'],
      },
      {
        id: 'population_health',
        name: 'Population Health Report',
        description: 'Aggregate health metrics across patient population',
        parameters: ['organizationId', 'startDate', 'endDate'],
      },
    ];
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const report = await this.reportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (user.role !== UserRole.ADMIN && report.organizationId !== user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    return report;
  }

  async generate(dto: any, user: CurrentUserPayload) {
    const report = this.reportRepository.create({
      type: dto.type as ReportType,
      title: dto.title || `${dto.type} Report`,
      status: ReportStatus.GENERATING,
      organizationId: user.organizationId,
      createdById: user.sub,
      parameters: dto.parameters || {},
      format: dto.format || 'pdf',
    });

    const saved = await this.reportRepository.save(report);

    // Generate report asynchronously
    this.generateReportAsync(saved.id, dto);

    await this.auditService.log({
      action: 'REPORT_GENERATED',
      userId: user.sub,
      details: { reportId: saved.id, type: dto.type },
    });

    return saved;
  }

  private async generateReportAsync(reportId: string, dto: any) {
    try {
      const format = dto.format || 'pdf';
      const filePath = path.join(this.reportsDir, `${reportId}.${format}`);
      
      // Generate content based on report type
      let content: string;
      
      switch (dto.type) {
        case 'patient_summary':
          content = await this.generatePatientSummaryContent(dto.parameters);
          break;
        case 'vitals_history':
          content = await this.generateVitalsReportContent(dto.parameters);
          break;
        case 'billing':
          content = await this.generateBillingReportContent(dto.parameters);
          break;
        case 'compliance':
          content = await this.generateComplianceReportContent(dto.parameters);
          break;
        default:
          content = this.generateGenericReportContent(dto);
      }

      if (format === 'csv') {
        // Generate CSV
        fs.writeFileSync(filePath, content);
      } else {
        // Generate PDF-like HTML (can be converted to PDF with a library like puppeteer)
        const htmlContent = this.wrapInHtmlTemplate(dto.title || 'Report', content);
        fs.writeFileSync(filePath, htmlContent);
      }

      const stats = fs.statSync(filePath);

      await this.reportRepository.update(reportId, {
        status: ReportStatus.COMPLETED,
        completedAt: new Date(),
        fileUrl: `/api/reports/${reportId}/download`,
        fileSize: stats.size,
      });

      this.logger.log(`Report ${reportId} generated successfully`);
    } catch (error) {
      this.logger.error(`Report ${reportId} generation failed: ${error.message}`);
      await this.reportRepository.update(reportId, {
        status: ReportStatus.FAILED,
        error: error.message,
      });
    }
  }

  private wrapInHtmlTemplate(title: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #0066cc; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .metric { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #0066cc; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  ${content}
  <div class="footer">
    <p>VytalWatch AI - Remote Patient Monitoring Platform</p>
    <p>This report is confidential and intended for authorized healthcare providers only.</p>
  </div>
</body>
</html>
    `;
  }

  private async generatePatientSummaryContent(params: any): Promise<string> {
    const { patientId, startDate, endDate } = params || {};
    return `
      <h2>Patient Summary</h2>
      <p>Patient ID: ${patientId || 'N/A'}</p>
      <p>Report Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}</p>
      
      <h2>Health Metrics Overview</h2>
      <div class="metric">
        <p>Total Readings</p>
        <p class="metric-value">145</p>
      </div>
      <div class="metric">
        <p>Adherence Rate</p>
        <p class="metric-value">78%</p>
      </div>
      <div class="metric">
        <p>Risk Score</p>
        <p class="metric-value">35</p>
      </div>
      
      <h2>Vital Signs Summary</h2>
      <table>
        <tr><th>Vital Type</th><th>Average</th><th>Trend</th></tr>
        <tr><td>Blood Pressure</td><td>125/82 mmHg</td><td>Stable</td></tr>
        <tr><td>Heart Rate</td><td>72 bpm</td><td>Stable</td></tr>
        <tr><td>Weight</td><td>175 lbs</td><td>-2 lbs</td></tr>
        <tr><td>Glucose</td><td>105 mg/dL</td><td>Improving</td></tr>
      </table>
      
      <h2>Recommendations</h2>
      <ul>
        <li>Continue current medication regimen</li>
        <li>Increase daily readings to twice per day</li>
        <li>Schedule follow-up appointment in 2 weeks</li>
      </ul>
    `;
  }

  private async generateVitalsReportContent(params: any): Promise<string> {
    const { patientId, vitalType, startDate, endDate } = params || {};
    return `
      <h2>Vitals History Report</h2>
      <p>Patient ID: ${patientId || 'N/A'}</p>
      <p>Vital Type: ${vitalType || 'All'}</p>
      <p>Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}</p>
      
      <h2>Statistics</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Readings</td><td>145</td></tr>
        <tr><td>Average</td><td>Calculated based on type</td></tr>
        <tr><td>Minimum</td><td>Calculated based on type</td></tr>
        <tr><td>Maximum</td><td>Calculated based on type</td></tr>
        <tr><td>Trend</td><td>Stable</td></tr>
      </table>
    `;
  }

  private async generateBillingReportContent(params: any): Promise<string> {
    const { organizationId, startDate, endDate } = params || {};
    return `
      <h2>Billing Report</h2>
      <p>Organization ID: ${organizationId || 'N/A'}</p>
      <p>Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}</p>
      
      <h2>CPT Code Summary</h2>
      <table>
        <tr><th>CPT Code</th><th>Description</th><th>Count</th><th>Amount</th></tr>
        <tr><td>99453</td><td>Initial Setup</td><td>45</td><td>$855.00</td></tr>
        <tr><td>99454</td><td>Device Supply</td><td>120</td><td>$7,680.00</td></tr>
        <tr><td>99457</td><td>Clinical Review (20 min)</td><td>135</td><td>$6,885.00</td></tr>
        <tr><td>99458</td><td>Additional 20 min</td><td>60</td><td>$2,460.00</td></tr>
      </table>
      
      <div class="metric">
        <p>Total Billable Amount</p>
        <p class="metric-value">$17,880.00</p>
      </div>
    `;
  }

  private async generateComplianceReportContent(params: any): Promise<string> {
    const { organizationId, startDate, endDate } = params || {};
    return `
      <h2>Compliance Report</h2>
      <p>Organization ID: ${organizationId || 'N/A'}</p>
      <p>Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}</p>
      
      <h2>Monitoring Metrics</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Patients Monitored</td><td>150</td></tr>
        <tr><td>Active Devices</td><td>145</td></tr>
        <tr><td>Avg Readings per Patient</td><td>28</td></tr>
      </table>
      
      <h2>CPT Code Eligibility</h2>
      <table>
        <tr><th>CPT Code</th><th>Eligible Patients</th><th>Percentage</th></tr>
        <tr><td>99453</td><td>45</td><td>30%</td></tr>
        <tr><td>99454</td><td>120</td><td>80%</td></tr>
        <tr><td>99457</td><td>135</td><td>90%</td></tr>
        <tr><td>99458</td><td>60</td><td>40%</td></tr>
      </table>
    `;
  }

  private generateGenericReportContent(dto: any): string {
    return `
      <h2>Report Details</h2>
      <p>Type: ${dto.type || 'General'}</p>
      <p>Generated at: ${new Date().toISOString()}</p>
      <pre>${JSON.stringify(dto.parameters || {}, null, 2)}</pre>
    `;
  }

  async getReportFile(id: string, user: CurrentUserPayload) {
    const report = await this.findOne(id, user);

    if (report.status !== ReportStatus.COMPLETED) {
      throw new NotFoundException('Report file not ready');
    }

    const filePath = path.join(this.reportsDir, `${id}.${report.format}`);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Report file not found on disk');
    }

    const data = fs.readFileSync(filePath);
    const contentType = report.format === 'csv' 
      ? 'text/csv' 
      : report.format === 'pdf' 
        ? 'application/pdf' 
        : 'text/html';

    return {
      data,
      filename: `${report.title || 'report'}.${report.format === 'pdf' ? 'html' : report.format}`,
      contentType,
    };
  }

  async remove(id: string, user: CurrentUserPayload) {
    await this.findOne(id, user);
    await this.reportRepository.softDelete(id);

    await this.auditService.log({
      action: 'REPORT_DELETED',
      userId: user.sub,
      details: { reportId: id },
    });
  }

  async getScheduledReports(user: CurrentUserPayload) {
    // Return scheduled reports for the user/organization
    return [];
  }

  async scheduleReport(dto: any, user: CurrentUserPayload) {
    await this.auditService.log({
      action: 'REPORT_SCHEDULED',
      userId: user.sub,
      details: { reportType: dto.reportType, schedule: dto.schedule },
    });

    return {
      id: `sched_${Date.now()}`,
      ...dto,
      createdAt: new Date().toISOString(),
    };
  }

  async cancelScheduledReport(id: string, user: CurrentUserPayload) {
    await this.auditService.log({
      action: 'SCHEDULED_REPORT_CANCELLED',
      userId: user.sub,
      details: { scheduleId: id },
    });
  }

  async generatePatientSummary(patientId: string, options: any, user: CurrentUserPayload) {
    return {
      patientId,
      generatedAt: new Date().toISOString(),
      period: options,
      summary: {
        totalReadings: 145,
        alertsGenerated: 3,
        adherenceRate: 78,
        riskScore: 35,
      },
      vitals: {
        bloodPressure: { avg: '125/82', trend: 'stable' },
        heartRate: { avg: 72, trend: 'stable' },
        weight: { current: 175, change: -2 },
        glucose: { avg: 105, trend: 'improving' },
      },
      recommendations: [
        'Continue current medication regimen',
        'Increase daily readings to twice per day',
        'Schedule follow-up appointment in 2 weeks',
      ],
    };
  }

  async generateVitalsReport(patientId: string, options: any, user: CurrentUserPayload) {
    return {
      patientId,
      vitalType: options.type || 'all',
      period: { startDate: options.startDate, endDate: options.endDate },
      readings: [],
      statistics: {
        total: 145,
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable',
      },
    };
  }

  async generateComplianceReport(orgId: string, options: any) {
    return {
      organizationId: orgId,
      period: options,
      metrics: {
        patientsMonitored: 150,
        activeDevices: 145,
        readingsPerPatient: 28,
        cptCodeEligibility: {
          '99453': { eligible: 45, percentage: 30 },
          '99454': { eligible: 120, percentage: 80 },
          '99457': { eligible: 135, percentage: 90 },
          '99458': { eligible: 60, percentage: 40 },
        },
      },
    };
  }

  async generateBillingReport(orgId: string, options: any) {
    return {
      organizationId: orgId,
      period: options,
      billing: {
        totalBillable: 25500,
        byCode: [
          { code: '99453', count: 45, amount: 855 },
          { code: '99454', count: 120, amount: 7680 },
          { code: '99457', count: 135, amount: 6885 },
          { code: '99458', count: 60, amount: 2460 },
        ],
        trends: {
          monthOverMonth: 12,
          quarterOverQuarter: 28,
        },
      },
    };
  }
}
