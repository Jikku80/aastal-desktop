import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { User } from '../../users/entities/user.entity';

export enum NoticeScope {
  CLINIC_WIDE  = 'clinic_wide',   // visible to all branches & all staff
  BRANCH       = 'branch',         // only visible to specific branch(es)
  TEAM_MEMBER  = 'team_member',    // only visible to specific user(s)
  ROLE         = 'role',           // only visible to specific role(s) — built-in UserRole values or custom RBAC Role UUIDs
}

export enum NoticeType {
  NOTICE  = 'notice',
  HOLIDAY = 'holiday',
}

@Entity('notices')
@Index(['clinicId'])
@Index(['clinicId', 'type'])
export class Notice {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @Column({ nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-enum' : 'enum', enum: NoticeType, default: NoticeType.NOTICE })
  type: NoticeType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** Date range for holidays */
  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  /**
   * Scope determines who sees this notice:
   * - CLINIC_WIDE → everyone in the clinic
   * - BRANCH → only staff of specific branches (see targetBranchIds)
   * - TEAM_MEMBER → only specific users (see targetUserIds)
   */
  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-enum' : 'enum', enum: NoticeScope, default: NoticeScope.CLINIC_WIDE })
  scope: NoticeScope;

  /**
   * When scope === BRANCH: array of branch IDs that should see this notice.
   * Empty / null → clinic_wide fallback.
   */
  @Column({ type: 'simple-json', nullable: true, default: '[]' })
  targetBranchIds: string[];

  /**
   * When scope === TEAM_MEMBER: array of user IDs that should see this notice.
   */
  @Column({ type: 'simple-json', nullable: true, default: '[]' })
  targetUserIds: string[];

  /**
   * When scope === ROLE: array of either built-in UserRole values
   * (e.g. 'dentist', 'receptionist') or custom RBAC Role UUIDs
   * (for roles like "Nurse" or "Lab Staff" that admins define themselves).
   */
  @Column({ type: 'simple-json', nullable: true, default: '[]' })
  targetRoles: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}