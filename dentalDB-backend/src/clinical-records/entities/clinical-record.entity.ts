import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

@Entity('clinical_records')
@Index(['clinicId', 'patientId'])
export class ClinicalRecord {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  doctorId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column({ nullable: true })
  appointmentId: string;

  @Column({ nullable: true, type: 'text' })
  diagnosisNotes: string;

  @Column({ nullable: true, type: 'text' })
  treatmentPlan: string;

  @Column({ type: 'simple-json', nullable: true })
  attachments: { name: string; url: string; type: string }[];

  @OneToMany(() => Prescription, p => p.clinicalRecord, { cascade: true, eager: true })
  prescriptions: Prescription[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('prescriptions')
export class Prescription {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicalRecordId: string;

  @ManyToOne(() => ClinicalRecord, r => r.prescriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicalRecordId' })
  clinicalRecord: ClinicalRecord;

  @Column()
  medicineName: string;

  @Column({ nullable: true })
  dosage: string;

  @Column({ nullable: true })
  frequency: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ nullable: true, type: 'text' })
  instructions: string;

  @CreateDateColumn() createdAt: Date;
}
