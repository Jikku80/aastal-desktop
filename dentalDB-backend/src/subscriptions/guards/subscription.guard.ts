import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { Clinic, SubscriptionPlan } from '../../clinics/entities/clinic.entity';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';

export const SKIP_SUBSCRIPTION_KEY = 'skipSubscription';
export const SkipSubscriptionCheck = () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@nestjs/common').SetMetadata(SKIP_SUBSCRIPTION_KEY, true);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Clinic)       private clinicRepo: Repository<Clinic>,
    @InjectRepository(Subscription) private subRepo:    Repository<Subscription>,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const req  = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // unauthenticated — let JwtAuthGuard handle it

    // Super admin is always unrestricted
    if (user.role === 'super_admin') return true;

    // If no clinicId, pass through (e.g. fresh setup routes)
    if (!user.clinicId) return true;

    const clinic = await this.clinicRepo.findOne({ where: { id: user.clinicId } });
    if (!clinic) return true;

    // Super-admin-level clinic flag (never locked)
    if ((clinic as any).isUnlimited) return true;

    const now = new Date();

    // ── FREE plan: 14-day trial from clinic creation ───────────────────────────
    if (clinic.plan === SubscriptionPlan.FREE) {
      const trialEnd = clinic.trialEndsAt;
      if (trialEnd && now > new Date(trialEnd)) {
        throw new ForbiddenException({
          code:    'TRIAL_EXPIRED',
          message: 'Your 14-day free trial has expired. Please upgrade to continue using DentalOS.',
          lockType: 'trial',
        });
      }
      return true; // still within trial
    }

    // ── Paid plans: check subscription status and billing cycle ──────────────
    const sub = await this.subRepo.findOne({ where: { clinicId: user.clinicId } });

    if (!sub) {
      // No subscription record for a paid plan — treat as expired
      throw new ForbiddenException({
        code:    'SUBSCRIPTION_NOT_FOUND',
        message: 'No active subscription found. Please renew your subscription.',
        lockType: 'no_sub',
      });
    }

    if (sub.status === SubscriptionStatus.CANCELLED || sub.status === SubscriptionStatus.EXPIRED) {
      throw new ForbiddenException({
        code:    'SUBSCRIPTION_CANCELLED',
        message: 'Your subscription has been cancelled. Please renew to continue.',
        lockType: 'cancelled',
      });
    }

    if (sub.currentPeriodEnd && now > new Date(sub.currentPeriodEnd)) {
      // Auto-expire the subscription
      await this.subRepo.update({ id: sub.id }, { status: SubscriptionStatus.EXPIRED });
      throw new ForbiddenException({
        code:    'SUBSCRIPTION_EXPIRED',
        message: 'Your subscription period has ended. Please renew to continue.',
        lockType: 'expired',
        expiredAt: sub.currentPeriodEnd,
      });
    }

    return true;
  }
}
