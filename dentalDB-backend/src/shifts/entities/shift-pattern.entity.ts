import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User }  from '../../users/entities/user.entity';
import { Shift } from './shift.entity';

/**
 * A standing rule: "User X works shift Y every Monday".
 * dayOfWeek: 0=Sunday … 6=Saturday (matches JS Date.getDay()).
 */
@Entity('shift_patterns')
@Index(['clinicId', 'userId', 'dayOfWeek'], { unique: true })
export class ShiftPattern {
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

  /** 0 = Sunday, 1 = Monday … 6 = Saturday */
  @Column({ type: 'int' })
  dayOfWeek: number;

  /** null means OFF on this day of week */
  @Column({ nullable: true })
  shiftId: string;

  @ManyToOne(() => Shift, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
