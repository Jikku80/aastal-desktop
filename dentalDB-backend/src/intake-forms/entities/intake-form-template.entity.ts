import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('intake_form_templates')
export class IntakeFormTemplate {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) clinicId: string;
  @Column({ nullable: true }) doctorUserId: string;
  @Column() name: string;
  @Column({ nullable: true }) specialty: string;
  @Column({ type: 'simple-json' }) fields: Record<string, any>[];
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
