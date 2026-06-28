import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';

// ─── Section Types ─────────────────────────────────────────────────────────────

export type SectionType =
  | 'hero' | 'about' | 'services' | 'team' | 'testimonials'
  | 'appointment-booking' | 'available-slots' | 'working-hours'
  | 'contact' | 'gallery' | 'faq' | 'stats' | 'cta-banner'
  | 'rich-text' | 'divider' | 'spacer' | 'map' | 'social-proof'
  | 'video' | 'branches' | 'products' | 'blog-articles' | 'mini-hero';

export interface SectionBackground {
  type: 'color' | 'gradient' | 'image';
  value: string;
}

export interface SectionConfig {
  id: string;
  type: SectionType;
  visible: boolean;
  settings: Record<string, any>;
  layout?: 'full' | 'contained' | 'wide';
  background?: SectionBackground;
  padding?: { top: number; bottom: number };
  anchor?: string;
}

export interface PageSeo {
  title?: string;
  description?: string;
}

export interface PageConfig {
  id: string;
  slug: string;
  title: string;
  enabled: boolean;
  isHome: boolean;
  seo?: PageSeo;
  sections: SectionConfig[];
}

// ─── Global Settings ───────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  pageId: string;
}

export interface NavCtaButton {
  text: string;
  action: 'book' | 'call' | 'link';
  value?: string;
}

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export interface GlobalSettings {
  nav: {
    logo?: string;
    logoText?: string;
    sticky: boolean;
    transparent: boolean;
    ctaButton?: NavCtaButton;
    links: NavLink[];
  };
  footer: {
    tagline?: string;
    columns: FooterColumn[];
    showSocials: boolean;
    socials?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      youtube?: string;
    };
    copyrightText?: string;
  };
  favicon?: string;
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  buttonStyle: 'filled' | 'outlined' | 'ghost';
  spacing: 'compact' | 'normal' | 'spacious';
}

// ─── SEO ───────────────────────────────────────────────────────────────────────

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

// ─── Entity ────────────────────────────────────────────────────────────────────

@Entity('clinic_websites')
@Index(['clinicId'], { unique: true })
export class ClinicWebsite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  // ── New V2 columns ──────────────────────────────────────────────────────────

  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', default: [] })
  pages: PageConfig[];

  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', default: {} })
  globalSettings: GlobalSettings;

  // ── Existing columns (preserved) ───────────────────────────────────────────

  @Column({ nullable: true })
  templateId: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true, unique: true })
  subdomain: string;

  @Column({ nullable: true })
  customDomain: string;

  @Column({ default: false })
  domainVerified: boolean;

  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', nullable: true, default: {} })
  seo: SeoConfig;

  /** Legacy flat content — kept for backward compatibility during transition */
  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', nullable: true })
  content: Record<string, any>;

  @Column({ type: process.env.DB_DRIVER === 'sqlite' ? 'simple-json' : 'jsonb', nullable: true, default: {} })
  theme: ThemeConfig;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
