import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';

@Injectable()
export class OfflineAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(OfflineAdminSeeder.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    private config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get('DB_DRIVER', 'postgres') !== 'sqlite') return;

    const existingClinicCount = await this.clinicRepo.count();
    if (existingClinicCount > 0) return;

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

    this.logger.warn('════════════════════════════════════════════════════════');
    this.logger.warn('  No clinic found locally — seeded a local offline owner account.');
    this.logger.warn(`  Email:    ${email}`);
    this.logger.warn(`  Password: ${generatedPassword}`);
    this.logger.warn('  Log in with these credentials to start using the app offline.');
    this.logger.warn('  The FIRST TIME you log in while online, this account and clinic');
    this.logger.warn('  are automatically created on the hosted Aastal backend too.');
    this.logger.warn('════════════════════════════════════════════════════════');
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