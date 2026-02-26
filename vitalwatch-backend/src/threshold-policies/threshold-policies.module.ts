import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThresholdPolicy } from './entities/threshold-policy.entity';
import { ThresholdPoliciesService } from './threshold-policies.service';
import { ThresholdPoliciesController } from './threshold-policies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ThresholdPolicy])],
  providers: [ThresholdPoliciesService],
  controllers: [ThresholdPoliciesController],
  exports: [ThresholdPoliciesService],
})
export class ThresholdPoliciesModule {}
