import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIDraft, AIDraftStatus, AIDraftType } from './entities/ai-draft.entity';

@Injectable()
export class AIDraftsService {
  constructor(@InjectRepository(AIDraft) private readonly repo: Repository<AIDraft>) {}

  async create(data: Partial<AIDraft>): Promise<AIDraft> {
    const draft = this.repo.create(data);
    return this.repo.save(draft);
  }

  async findByPatient(patientId: string, draftType?: AIDraftType, status?: AIDraftStatus): Promise<AIDraft[]> {
    const query = this.repo.createQueryBuilder('d').where('d.patientId = :patientId', { patientId });
    if (draftType) query.andWhere('d.draftType = :draftType', { draftType });
    if (status) query.andWhere('d.status = :status', { status });
    return query.orderBy('d.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<AIDraft> {
    const draft = await this.repo.findOne({ where: { id } });
    if (!draft) throw new NotFoundException('AI Draft not found');
    return draft;
  }

  async review(id: string, userId: string, status: AIDraftStatus, notes?: string): Promise<AIDraft> {
    await this.repo.update(id, { status, reviewedByUserId: userId, reviewedAt: new Date(), reviewNotes: notes });
    return this.findOne(id);
  }

  async linkToNote(id: string, noteId: string): Promise<AIDraft> {
    await this.repo.update(id, { usedInNoteId: noteId, status: AIDraftStatus.ACCEPTED });
    return this.findOne(id);
  }
}
