import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('consent_templates')
export class ConsentTemplate {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) clinicId: string;
  @Column({ nullable: true }) doctorUserId: string;
  @Column() name: string;
  @Column({ type: 'text' }) bodyText: string;
  @Column({ type: 'simple-json' }) requiredCheckboxes: { label: string; required: boolean }[];
  @Column({ nullable: true }) specialty: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
