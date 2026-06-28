import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToMany, JoinTable, ManyToOne, JoinColumn,
} from 'typeorm';
import { Permission } from './permission.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';

@Entity('roles')
export class Role {
  @Column({ type: 'varchar', length: 20, default: 'synced' })
  syncStatus: 'synced' | 'pending' | 'conflict';

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  clinicId: string;

  @ManyToOne(() => Clinic, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  /** System roles (owner) cannot be deleted or renamed */
  @Column({ default: false })
  isSystem: boolean;

  @ManyToMany(() => Permission, (perm) => perm.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn:        { name: 'roleId',       referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
