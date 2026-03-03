import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIDraft } from './entities/ai-draft.entity';
import { AIDraftsService } from './ai-drafts.service';
import { AIDraftsController } from './ai-drafts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AIDraft])],
  providers: [AIDraftsService],
  controllers: [AIDraftsController],
  exports: [AIDraftsService],
})
export class AIDraftsModule {}
