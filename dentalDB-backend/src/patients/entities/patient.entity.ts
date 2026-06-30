import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { Branch } from '../../branch/entities/branch.entity';

export enum Gender    { MALE = 'male', FEMALE = 'female', OTHER = 'other' }
export enum BloodGroup {
  A_POS = 'A+', A_NEG = 'A-', B_POS = 'B+', B_NEG = 'B-',
  O_POS = 'O+', O_NEG = 'O-', AB_POS = 'AB+', AB_NEG = 'AB-',
}

@Entity('patients')
@Index(['clinicId', 'email'])
@Index(['branchId'])
@Index(['clinicId', 'opdNo'])
export class Patient {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /**
   * Primary branch for this patient. NULL = accessible from any branch.
   * Patients can still be seen at other branches, but this is the home branch.
   */
  @Column({ nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  /** Outpatient Department number — used for quick lookup across records & billing */
  @Column({ nullable: true })
  opdNo: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  /** Stored age in years (used when dateOfBirth is not known) */
  @Column({ nullable: true, type: 'int' })
  ageYears: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: BloodGroup, nullable: true })
  bloodGroup: BloodGroup;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactPhone: string;

  // NOTE: switched from Postgres `array: true` text columns to `simple-array`
  // so this entity is portable to SQLite (offline mode). simple-array stores
  // a comma-joined string under the hood on both drivers — TypeORM handles
  // the (de)serialization, so application code is unaffected. Any raw SQL or
  // QueryBuilder using Postgres array operators (&&, @>, ANY()) against these
  // columns will need to be rewritten — none were found in the current
  // codebase, but flagging here in case future code adds them.
  @Column({ type: 'simple-array', default: '' })
  allergies: string[];

  @Column({ type: 'simple-array', default: '' })
  medicalConditions: string[];

  @Column({ type: 'simple-array', default: '' })
  currentMedications: string[];

  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  dentalHistory: Record<string, any>;

  @Column({ nullable: true })
  insuranceProvider: string;

  @Column({ nullable: true })
  insurancePolicyNumber: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastVisitAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string { return `${this.firstName} ${this.lastName}`; }

  get age(): number | null {
    if (this.ageYears != null) return this.ageYears;
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const dob   = new Date(this.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }
}