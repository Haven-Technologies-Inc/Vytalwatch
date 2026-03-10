import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('patient_profiles')
export class PatientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', unique: true })
  patientId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'assigned_provider_id', nullable: true })
  assignedProviderId: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ nullable: true })
  gender: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ name: 'emergency_contact', nullable: true })
  emergencyContact: string | null;

  @Column({ name: 'emergency_phone', nullable: true })
  emergencyPhone: string | null;

  @Column({ name: 'insurance_provider', nullable: true })
  insuranceProvider: string | null;

  @Column({ name: 'insurance_id', nullable: true })
  insuranceId: string | null;

  @Column({ name: 'conditions', type: 'jsonb', nullable: true, default: '[]' })
  conditions: string[];

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  allergies: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
