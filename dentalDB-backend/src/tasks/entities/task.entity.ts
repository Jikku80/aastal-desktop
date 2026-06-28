import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branch/entities/branch.entity';

export enum TaskStatus {
  PENDING   = 'pending',
  ONGOING   = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW    = 'low',
  MEDIUM = 'medium',
  HIGH   = 'high',
}

@Entity('tasks')
@Index(['clinicId', 'status'])
@Index(['clinicId', 'assignedToUserId'])
@Index(['clinicId', 'assignedToBranchId'])
export class Task {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  /** Assigned to a specific staff member */
  @Column({ nullable: true })
  assignedToUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedToUser: User;

  /** Assigned to an entire branch */
  @Column({ nullable: true })
  assignedToBranchId: string;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'assignedToBranchId' })
  assignedToBranch: Branch;

  /** Who created this task */
  @Column({ nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'text', nullable: true })
  completionNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
