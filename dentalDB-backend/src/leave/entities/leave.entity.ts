import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User } from '../../users/entities/user.entity';

export enum LeaveType {
  SICK    = 'sick',
  CASUAL  = 'casual',
  ANNUAL  = 'annual',
  UNPAID  = 'unpaid',
  OTHER   = 'other',
}

export enum LeaveStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('leaves')
@Index(['clinicId', 'userId'])
export class Leave {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: LeaveType })
  leaveType: LeaveType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({ nullable: true })
  approvedByUserId: string;

  @Column({ nullable: true })
  approvalNote: string;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
