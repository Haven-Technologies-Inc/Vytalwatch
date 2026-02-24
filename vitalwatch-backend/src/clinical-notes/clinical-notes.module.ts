import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNote, CommunicationLog } from './entities/clinical-note.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalNote, CommunicationLog]),
    AuditModule,
  ],
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
  exports: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
