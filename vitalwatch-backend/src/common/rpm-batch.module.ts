import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RPMBatchService } from './rpm-batch.service';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Task } from '../tasks/entities/task.entity';
import { Claim } from '../claims/entities/claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Task, Claim])],
  providers: [RPMBatchService],
  exports: [RPMBatchService],
})
export class RPMBatchModule {}
