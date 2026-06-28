import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

const isSQLite = process.env.DB_DRIVER === 'sqlite';
import { User }  from '../../users/entities/user.entity';
import { Shift } from './shift.entity';

export enum AssignmentType {
  OVERRIDE = 'override',   // working a different shift that day
  LEAVE    = 'leave',      // on approved leave (links to leave record)
  OFF      = 'off',        // admin-marked day off
}

/**
 * Date-specific override. Takes highest priority over ShiftPattern.
 * shiftId is nullable when type=LEAVE or type=OFF.
 */
@Entity('shift_assignments')
@Index(['clinicId', 'userId', 'date'], { unique: true })
export class ShiftAssignment {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @Column({ nullable: true })
  branchId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** YYYY-MM-DD */
  @Column({ type: 'date' })
  date: string;

  /** null for LEAVE / OFF */
  @Column({ nullable: true })
  shiftId: string;

  @ManyToOne(() => Shift, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: isSQLite ? 'varchar' : 'enum', enum: AssignmentType, default: AssignmentType.OVERRIDE })
  type: AssignmentType;

  @Column({ nullable: true })
  note: string;

  /** Optional reference to Leave record */
  @Column({ nullable: true })
  leaveId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
