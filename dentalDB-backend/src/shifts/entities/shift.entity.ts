import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('shifts')
@Index(['clinicId', 'name'], { unique: true })
export class Shift {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** e.g. "Morning", "Day", "Evening", "Night" */
  @Column()
  name: string;

  /** HH:MM 24-hour, clinic-local time, e.g. "08:00" */
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  /** HH:MM 24-hour, e.g. "16:00" */
  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  /** Minutes after startTime before a check-in is considered LATE */
  @Column({ default: 15 })
  graceMinutes: number;

  /**
   * Minimum hours worked to count as PRESENT (vs HALF_DAY).
   * Defaults to half the shift duration.
   */
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 4 })
  minHoursForPresent: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  /** Derived: total shift duration in hours */
  get durationHours(): number {
    const [sh, sm] = this.startTime.split(':').map(Number);
    const [eh, em] = this.endTime.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  }
}