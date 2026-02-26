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

  async findByPatient(patientId: string): Promise<Claim[]> {
    return this.repo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }
}
