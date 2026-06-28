import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Entity('seo_redirects')
@Index(['clinicId', 'fromPath'], { unique: true })
export class SeoRedirect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** Source path, always starts with "/" e.g. /old-page */
  @Column()
  fromPath: string;

  /** Destination path or absolute URL */
  @Column()
  toPath: string;

  @Column({ default: 301 })
  statusCode: 301 | 302;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
