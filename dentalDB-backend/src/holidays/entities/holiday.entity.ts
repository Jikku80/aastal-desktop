import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Clinic }  from '../../clinics/entities/clinic.entity';
import { Branch }  from '../../branch/entities/branch.entity';

const isSQLite = process.env.DB_DRIVER === 'sqlite';

@Entity('holidays')
@Index(['clinicId'])
@Index(['clinicId', 'date'])
export class Holiday {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ nullable: true })
  description?: string;

  /** true = applies to all branches; false = branch-specific or team-member-specific */
  @Column({ default: true })
  isClinicWide: boolean;

  /** true = applies to specific team members (targetUserIds) */
  @Column({ default: false })
  isTeamMemberSpecific: boolean;

  /** Primary branch (kept for backward-compat) */
  @Column({ nullable: true })
  branchId?: string;

  /** Multiple branches — when set, holiday applies to all listed branches */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true })
  branchIds?: string[];

  /** When isTeamMemberSpecific=true: array of user IDs this holiday applies to */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true, default: '[]' })
  targetUserIds: string[];

  /** true = applies only to specific roles (see targetRoles) */
  @Column({ default: false })
  isRoleSpecific: boolean;

  /** Built-in UserRole values (e.g. 'dentist') or custom RBAC Role UUIDs this holiday applies to */
  @Column({ type: isSQLite ? 'simple-json' : 'jsonb', nullable: true, default: '[]' })
  targetRoles: string[];

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}