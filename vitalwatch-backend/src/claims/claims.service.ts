import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim, ClaimStatus } from './entities/claim.entity';
import * as crypto from 'crypto';

@Injectable()
export class ClaimsService {
  constructor(@InjectRepository(Claim) private readonly repo: Repository<Claim>) {}

  async build(data: { patientId: string; enrollmentId: string; periodStart: Date; periodEnd: Date; programType: string; readingDaysCount: number; interactiveTimeMinutes: number; notesSigned: boolean }): Promise<Claim> {
    const readinessChecks = {
      deviceTransmission: data.readingDaysCount > 0,
      readingDaysThreshold: data.readingDaysCount >= 16,
      readingDaysCount: data.readingDaysCount,
      interactiveTimeMinutes: data.interactiveTimeMinutes,
      interactiveTimeThreshold: data.interactiveTimeMinutes >= 20,
      notesSigned: data.notesSigned,
      medicalNecessity: true,
    };
    const isReady = Object.values(readinessChecks).every(v => typeof v === 'boolean' ? v : true);
    const claim = this.repo.create({ ...data, readinessChecks, codes: [], status: isReady ? ClaimStatus.READY : ClaimStatus.DRAFT });
    return this.repo.save(claim);
  }

  async findOne(id: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  async finalize(id: string): Promise<Claim> {
    const claim = await this.findOne(id);
    const bundleHash = crypto.createHash('sha256').update(JSON.stringify(claim)).digest('hex');
    await this.repo.update(id, { status: ClaimStatus.READY, supportingBundleHash: bundleHash });
    return this.findOne(id);
  }

  async submit(id: string): Promise<Claim> {
    const claim = await this.findOne(id);
    await this.repo.update(id, { status: ClaimStatus.SUBMITTED, submittedAt: new Date() } as any);
    return this.findOne(id);
  }

  async getBillingSummary(clinicId: string, periodStart: Date, periodEnd: Date): Promise<any[]> {
    const claims = await this.repo
      .createQueryBuilder('c')
      .where('c.createdAt >= :periodStart AND c.createdAt <= :periodEnd', { periodStart, periodEnd })
      .getMany();

    // Group by patient for billing summary
    const summaryMap = new Map<string, any>();
    for (const claim of claims) {
      const existing = summaryMap.get(claim.patientId) || {
        patientId: claim.patientId,
        enrollmentId: claim.enrollmentId,
        programType: claim.programType,
        periodStart,
        periodEnd,
        totalClaims: 0,
        readyClaims: 0,
        submittedClaims: 0,
      };
      existing.totalClaims++;
      if (claim.status === ClaimStatus.READY) existing.readyClaims++;
      if (claim.status === ClaimStatus.SUBMITTED) existing.submittedClaims++;
      summaryMap.set(claim.patientId, existing);
    }
    return Array.from(summaryMap.values());
  }

  async findByPatient(patientId: string): Promise<Claim[]> {
    return this.repo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }
}
