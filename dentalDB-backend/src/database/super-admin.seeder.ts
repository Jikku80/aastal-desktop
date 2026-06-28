import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';

const ADMIN_EMAIL    = 'admin@agnidental.com';
const ADMIN_PASSWORD = 'Agni@dm1n';

@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @InjectRepository(User)         private userRepo:   Repository<User>,
    @InjectRepository(Clinic)       private clinicRepo: Repository<Clinic>,
    @InjectRepository(Subscription) private subRepo:    Repository<Subscription>,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
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

    // ── 3. Upsert super admin user ──────────────────────────────────────────
    // MUST use addSelect to load password (column has select:false on entity)
    const existing = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')          // bypass select:false
      .where('u.email = :email', { email: ADMIN_EMAIL })
      .getOne();

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

    if (!existing) {
      // Fresh create
      await this.userRepo.save(this.userRepo.create({
        firstName: 'Super',
        lastName:  'Admin',
        email:     ADMIN_EMAIL,
        password:  hashed,
        role:      UserRole.SUPER_ADMIN,
        clinicId:  clinic.id,
        isActive:  true,
      }));
      this.logger.log(`✅ SuperAdmin created`);
    } else {
      // User exists — verify the stored hash matches the expected password.
      // If not (e.g. from a botched previous seed), force-reset it.
      const passwordOk = existing.password
        ? await bcrypt.compare(ADMIN_PASSWORD, existing.password)
        : false;

      if (!passwordOk) {
        await this.userRepo.update(existing.id, {
          password:  hashed,
          isActive:  true,
          role:      UserRole.SUPER_ADMIN,
          clinicId:  clinic.id,
        });
        this.logger.warn(`⚠️  SuperAdmin password was invalid — reset to default`);
      } else {
        this.logger.log(`SuperAdmin already exists and credentials are valid`);
      }
    }
  }
}