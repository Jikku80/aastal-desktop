import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User }  from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

export enum AttendanceStatus {
  PRESENT  = 'present',
  ABSENT   = 'absent',
  LATE     = 'late',
  HALF_DAY = 'half_day',
  LEAVE    = 'leave',
  OFF      = 'off',
}

@Entity('attendance')
@Index(['clinicId', 'userId', 'date'], { unique: true })
export class Attendance {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() clinicId: string;
  @Column({ nullable: true }) branchId: string;
  @Column() userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date' }) date: string;

  /** Shift this record is evaluated against */
  @Column({ nullable: true }) shiftId: string;

  @ManyToOne(() => Shift, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true }) checkIn:  Date;
  @Column({ type: isSQLite ? 'datetime' : 'timestamptz', nullable: true }) checkOut: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) hoursWorked: number;

  /** Minutes past shift start when user checked in */
  @Column({ type: 'int', nullable: true }) lateMinutes: number;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AttendanceStatus, default: AttendanceStatus.ABSENT })
  status: AttendanceStatus;

  /** true if auto-marked absent by cron */
  @Column({ default: false }) isAutoMarked: boolean;

  @Column({ nullable: true }) notes: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
