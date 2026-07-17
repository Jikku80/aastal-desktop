import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';

@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @InjectRepository(User)         private userRepo:   Repository<User>,
    @InjectRepository(Clinic)       private clinicRepo: Repository<Clinic>,
    @InjectRepository(Subscription) private subRepo:    Repository<Subscription>,
    private config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    // This seeds the platform's single global super-admin account and its
    // enterprise Subscription record — both online/server-only concepts.
    // On the offline desktop (SQLite) build there is no Subscription entity
    // registered at all (subscriptions is an online-only module, see
    // data-source.sqlite.ts), so running this against a per-clinic offline
    // install would throw EntityMetadataNotFoundError on first boot.
    if (this.config.get('DB_DRIVER', 'postgres') === 'sqlite') {
      this.logger.log('Skipping super-admin seed — offline/desktop build has no platform-admin or Subscription entity.');
      return;
    }
    await this.seed();
  }

  /**
   * No credential is ever hardcoded in source here — a literal secret baked
   * into the codebase ships with every build artifact and is trivially
   * recoverable (e.g. `strings dist/main.js`), regardless of whether it's
   * ever printed to a console. Instead:
   *  - production requires SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD to be
   *    set explicitly (fails startup otherwise, rather than falling back to
   *    a guessable default)
   *  - non-production environments get a strong password auto-generated
   *    and logged exactly once, the same safe pattern already used for the
   *    per-install offline owner account (see offline-admin.seeder.ts)
   */
  private resolveCredentials(): { email: string; password: string; generated: boolean } {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL') ?? '';
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD') ?? '';
    const isProd = (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';

    if (email && password) return { email, password, generated: false };

    if (isProd) {
      throw new Error(
        'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must both be set in production — refusing to start with no credentials configured.',
      );
    }

    return {
      email: email || 'admin@agnidental.com',
      password: password || this.generateStrongPassword(),
      generated: !password,
    };
  }

  private generateStrongPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;
    const pick = (chars: string) => chars[crypto.randomInt(chars.length)];
    const required = [pick(upper), pick(lower), pick(digits), pick(special)];
    const filler = Array.from({ length: 12 }, () => pick(all));
    return [...required, ...filler].sort(() => crypto.randomInt(3) - 1).join('');
  }

  async seed() {
    const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, generated } = this.resolveCredentials();

    // ── 1. Upsert clinic ────────────────────────────────────────────────────
    let clinic: Clinic | null = await this.clinicRepo.findOne({
      where: { slug: 'agni-dental-admin' },
    });

    if (!clinic) {
      const created = this.clinicRepo.create({
        name:               'Agni Dental Admin',
        slug:               'agni-dental-admin',
        plan:               SubscriptionPlan.ENTERPRISE,
        email:              ADMIN_EMAIL,
        isActive:           true,
        subscriptionEndsAt: new Date('2099-12-31'),
      } as any);
      clinic = await this.clinicRepo.save(created) as unknown as Clinic;
      this.logger.log(`Created admin clinic: ${clinic.id}`);
    }

    // ── 2. Upsert subscription ───────────────────────────────────────────────
    const existingSub = await this.subRepo.findOne({ where: { clinicId: clinic.id } });
    if (!existingSub) {
      await this.subRepo.save(this.subRepo.create({
        clinicId:           clinic.id,
        plan:               'enterprise',
        status:             SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd:   new Date('2099-12-31'),
        features: [
          'appointments', 'patients', 'billing', 'sms_reminders', 'analytics',
          'website_builder', 'ai_scheduling', 'custom_domain', 'paypal',
          'multi_location', 'priority_support', 'api_access',
        ],
      }));
      this.logger.log('Created enterprise subscription for admin clinic');
    }

    // ── 3. Create super admin user, ONLY if one doesn't already exist ───────
    // Deliberately does NOT reset the password of an existing account: doing
    // that on every boot would silently undo any password change an admin
    // makes, and would mean the seed value (even a randomly-generated one)
    // stays a permanent backdoor for the account's whole lifetime. Rotating
    // a lost/compromised password is a separate, explicit action, not
    // something that happens automatically on startup.
    const existing = await this.userRepo.findOne({ where: { email: ADMIN_EMAIL } });

    if (!existing) {
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await this.userRepo.save(this.userRepo.create({
        firstName: 'Super',
        lastName:  'Admin',
        email:     ADMIN_EMAIL,
        password:  hashed,
        role:      UserRole.SUPER_ADMIN,
        clinicId:  clinic.id,
        isActive:  true,
      }));
      this.logger.log('✅ SuperAdmin created');
      if (generated) {
        this.logger.warn('════════════════════════════════════════════════════════');
        this.logger.warn('  No SUPER_ADMIN_PASSWORD was configured — generated one for this install.');
        this.logger.warn(`  Email:    ${ADMIN_EMAIL}`);
        this.logger.warn(`  Password: ${ADMIN_PASSWORD}`);
        this.logger.warn('  Set SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in the environment to pin this.');
        this.logger.warn('════════════════════════════════════════════════════════');
      }
    } else {
      this.logger.log('SuperAdmin already exists — leaving existing credentials untouched.');
    }
  }
}