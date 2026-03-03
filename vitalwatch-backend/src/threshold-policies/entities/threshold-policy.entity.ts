import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('threshold_policies')
@Index(['clinicId', 'programType'])
@Index(['isActive'])
export class ThresholdPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clinicId: string;

  @Column()
  programType: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb' })
  rules: {
    bp?: {
      hypertensiveUrgency: { systolic: number; diastolic: number };
      hypotension: { systolic: number; diastolic: number };
      persistentElevation: { systolic: number; diastolic: number; daysThreshold: number };
    };
    glucose?: {
      hypoglycemia: number;
      hyperglycemia: number;
      criticalLow: number;
      criticalHigh: number;
    };
    adherence?: {
      reminderAfterDays: number;
      escalationAfterDays: number;
    };
  };

  @Column({ type: 'timestamp' })
  effectiveFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date;

  @Column('uuid')
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
