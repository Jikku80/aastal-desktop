import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class OfflineAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(OfflineAdminSeeder.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    private config: ConfigService,
    private rbac: RbacService,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get('DB_DRIVER', 'postgres') !== 'sqlite') return;

    const existingClinicCount = await this.clinicRepo.count();
    if (existingClinicCount > 0) {
      // Backfill for installs that were created before this file started
      // setting trialEndsAt — otherwise an app upgraded in place would have
      // a FREE-plan clinic with no trial deadline at all, i.e. never locks.
      await this.clinicRepo
        .update(
          { plan: SubscriptionPlan.FREE, trialEndsAt: IsNull() },
          { trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        )
        .catch((err) => this.logger.warn(`Trial backfill skipped: ${err?.message ?? err}`));

      // Backfill for installs that were created before this file started
      // auto-provisioning a first branch (see below) — without at least one
      // Branch row, the navbar branch switcher, the Branches admin page,
      // and every branch-scoped feature (appointments, patients, billing,
      // ...) have nothing to show or assign records to.
      await this.ensureAtLeastOneBranch()
        .catch((err) => this.logger.warn(`Default-branch backfill skipped: ${err?.message ?? err}`));

      // Same idea for the default Doctor/Staff RBAC roles — installs from
      // before this existed would otherwise never get them since this
      // whole branch only runs once, at first launch, for a brand-new clinic.
      await this.ensureDefaultRolesExist()
        .catch((err) => this.logger.warn(`Default-role backfill skipped: ${err?.message ?? err}`));
      return;
    }

    const email = 'owner@local.aastal';
    const generatedPassword = this.generateCompliantPassword();
    const hashed = await bcrypt.hash(generatedPassword, 12);

    const clinic = await this.clinicRepo.save(
      this.clinicRepo.create({
        name: 'My Clinic (Not Yet Synced)',
        slug: `local-${crypto.randomBytes(4).toString('hex')}`,
        plan: SubscriptionPlan.FREE,
        isActive: true,
        isLocalPlaceholder: true,
        // Starts the 14-day free trial clock from the moment the app is
        // first installed and run — enforced offline by the license check
        // in jwt.strategy.ts / offline-license.util.ts, independent of
        // whether this device ever goes online before the trial ends.
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }),
    );

    await this.userRepo.save(
      this.userRepo.create({
        firstName: 'Clinic',
        lastName: 'Owner',
        email,
        password: hashed,
        role: UserRole.OWNER,
        clinicId: clinic.id,
        isActive: true,
      }),
    );

    // Every other piece of branch-scoped UI (navbar switcher, patients,
    // appointments, billing, ...) assumes at least one Branch row exists.
    // Without this, a fresh offline install has an owner account and a
    // clinic but literally nothing to select in the branch switcher — it
    // still renders (admins see "All Branches" / "Manage Branches" even at
    // zero branches), but there's nothing to actually switch between until
    // the owner manually visits Settings > Branches, which most people
    // never discover on first run. Seed one "Main Branch" so the app is
    // immediately usable, exactly like a fresh online signup would expect.
    await this.branchRepo.save(
      this.branchRepo.create({
        clinicId: clinic.id,
        name: 'Main Branch',
      }),
    );

    // Same "Doctor" / "Staff" default roles a hosted online registration
    // gets (see auth.service.ts register()) — so the offline owner has
    // ready-to-use roles the moment they add their first team member.
    await this.rbac.seedDefaultRolesForClinic(clinic.id);

    this.logger.warn('════════════════════════════════════════════════════════');
    this.logger.warn('  No clinic found locally — seeded a local offline owner account.');
    this.logger.warn(`  Email:    ${email}`);
    this.logger.warn(`  Password: ${generatedPassword}`);
    this.logger.warn('  Log in with these credentials to start using the app offline.');
    this.logger.warn('  The FIRST TIME you log in while online, this account and clinic');
    this.logger.warn('  are automatically created on the hosted Aastal backend too.');
    this.logger.warn('════════════════════════════════════════════════════════');
  }

  /** Idempotent: only inserts a branch if the clinic genuinely has zero. */
  private async ensureAtLeastOneBranch(): Promise<void> {
    const clinics = await this.clinicRepo.find();
    for (const clinic of clinics) {
      const count = await this.branchRepo.count({ where: { clinicId: clinic.id } });
      if (count > 0) continue;
      await this.branchRepo.save(
        this.branchRepo.create({ clinicId: clinic.id, name: 'Main Branch' }),
      );
      this.logger.warn(`Seeded a default "Main Branch" for clinic ${clinic.id} (had zero branches).`);
    }
  }

  /** Idempotent: RbacService.seedDefaultRolesForClinic only creates roles that don't already exist by name. */
  private async ensureDefaultRolesExist(): Promise<void> {
    const clinics = await this.clinicRepo.find();
    for (const clinic of clinics) {
      await this.rbac.seedDefaultRolesForClinic(clinic.id);
    }
  }

  private generateCompliantPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    const pick = (chars: string) => chars[crypto.randomInt(chars.length)];
    const required = [pick(upper), pick(lower), pick(digits), pick(special)];
    const filler = Array.from({ length: 10 }, () => pick(all));

    return [...required, ...filler]
      .sort(() => crypto.randomInt(3) - 1)
      .join('');
  }
}