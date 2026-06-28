import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { PatientAccount } from '../../patient-auth/entities/patient-account.entity';

@Entity('reviews')
@Index(['appointmentId'], { unique: true })
@Index(['clinicId'])
@Index(['doctorUserId'])
@Index(['patientAccountId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  clinicId: string;

  @ManyToOne(() => Clinic, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column({ nullable: true })
  branchId: string;

  @Column({ nullable: true })
  doctorUserId: string;

  @Column()
  patientAccountId: string;

  @ManyToOne(() => PatientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientAccountId' })
  patientAccount: PatientAccount;

  /** Only verified visit reviews (appointment must be COMPLETED) */
  @Column({ nullable: true })
  appointmentId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', nullable: true })
  clinicResponse: string;

  @Column({ type: 'text', nullable: true })
  doctorResponse: string;

  @Column({ nullable: true })
  responseAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
