import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToMany, JoinTable, ManyToOne, JoinColumn,
} from 'typeorm';
import { Permission } from './permission.entity';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { User } from '../../users/entities/user.entity';

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

  /**
   * Personal scope for independent-doctor roles (Part 7). Independent
   * doctors have no clinicId, so a clinic-scoped role can't represent
   * their permissions — this column is the dedicated scope key instead.
   * Exactly one of clinicId / doctorUserId should be set for any given
   * role; clinicId stays null here on purpose.
   * (Previously this was faked by stuffing `independent:<userId>` into
   * clinicId, which is a uuid FK column and rejected the value outright —
   * see RbacService.ensureIndependentDoctorRole.)
   */
  @Column({ nullable: true })
  doctorUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorUserId' })
  doctorUser: User;

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
