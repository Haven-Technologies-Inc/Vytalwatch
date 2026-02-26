import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThresholdPolicy } from './entities/threshold-policy.entity';

@Injectable()
export class ThresholdPoliciesService {
  constructor(@InjectRepository(ThresholdPolicy) private readonly repo: Repository<ThresholdPolicy>) {}

  async create(data: Partial<ThresholdPolicy>): Promise<ThresholdPolicy> {
    const existing = await this.repo.findOne({ where: { clinicId: data.clinicId, programType: data.programType, isActive: true } });
    if (existing) {
      await this.repo.update(existing.id, { isActive: false, effectiveTo: new Date() });
    }
    const maxVersion = existing ? existing.version + 1 : 1;
    const policy = this.repo.create({ ...data, version: maxVersion, effectiveFrom: new Date(), isActive: true });
    return this.repo.save(policy);
  }

  async findActive(clinicId: string, programType: string): Promise<ThresholdPolicy> {
    const policy = await this.repo.findOne({ where: { clinicId, programType, isActive: true } });
    if (!policy) throw new NotFoundException('No active policy found');
    return policy;
  }

  async findAll(clinicId: string): Promise<ThresholdPolicy[]> {
    return this.repo.find({ where: { clinicId }, order: { createdAt: 'DESC' } });
  }

  async findByDate(clinicId: string, programType: string, date: Date): Promise<ThresholdPolicy> {
    const policy = await this.repo.createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.programType = :programType', { programType })
      .andWhere('p.effectiveFrom <= :date', { date })
      .andWhere('(p.effectiveTo IS NULL OR p.effectiveTo >= :date)', { date })
      .orderBy('p.version', 'DESC')
      .getOne();
    if (!policy) throw new NotFoundException('No policy found for date');
    return policy;
  }
}
