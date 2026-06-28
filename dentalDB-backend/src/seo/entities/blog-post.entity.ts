import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';

export enum BlogStatus {
  DRAFT     = 'draft',
  PUBLISHED = 'published',
}

@Entity('blog_posts')
@Index(['clinicId', 'slug'], { unique: true })
@Index(['clinicId', 'status'])
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  // ── Content ───────────────────────────────────────────────────────────────
  @Column()
  title: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ type: 'text', nullable: true })
  content: string | null;   // stored as HTML

  @Column({ nullable: true })
  featuredImage: string | null;

  @Column({ nullable: true })
  authorName: string | null;

  @Column({ nullable: true })
  authorId: string | null;

  @Column({ type: 'simple-array', nullable: true })
  categories: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  @Column({ default: BlogStatus.DRAFT })
  status: BlogStatus;

  @Column({ nullable: true, type: 'timestamptz' })
  publishedAt: Date | null;

  // ── SEO ───────────────────────────────────────────────────────────────────
  @Column({ nullable: true })
  metaTitle: string | null;

  @Column({ type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ type: 'simple-array', nullable: true })
  metaKeywords: string[] | null;

  @Column({ nullable: true })
  ogImage: string | null;

  /** false = robots noindex for this post */
  @Column({ default: true })
  indexable: boolean;

  // ── Computed ──────────────────────────────────────────────────────────────
  @Column({ default: 1 })
  readingTimeMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
