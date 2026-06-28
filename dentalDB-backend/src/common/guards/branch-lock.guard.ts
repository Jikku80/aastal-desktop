import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, BranchStatus } from '../../branch/entities/branch.entity';

export const SKIP_BRANCH_LOCK_KEY = 'skipBranchLock';
export const SkipBranchLock = () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@nestjs/common').SetMetadata(SKIP_BRANCH_LOCK_KEY, true);

/**
 * BranchLockGuard
 *
 * Blocks ALL state-mutating requests (POST / PATCH / PUT / DELETE) that
 * target an inactive or locked branch.
 *
 * Branch status model:
 *   ACTIVE            — operational; requests pass through
 *   INACTIVE          — deactivated; mutations blocked (read-only)
 *   PENDING_SELECTION — downgrade in progress; mutations blocked (read-only)
 *
 * The branchId is resolved from, in order:
 *   1. req.body.branchId
 *   2. req.params.branchId
 *   3. req.user.branchId (JWT claim)
 *
 * Super-admins bypass this guard entirely.
 * GET / HEAD / OPTIONS are always allowed.
 */
@Injectable()
export class BranchLockGuard implements CanActivate {
  private static readonly MUTATING_METHODS = new Set([
    'POST', 'PATCH', 'PUT', 'DELETE',
  ]);

  constructor(
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_BRANCH_LOCK_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const req    = ctx.switchToHttp().getRequest();
    const method = (req.method as string).toUpperCase();

    if (!BranchLockGuard.MUTATING_METHODS.has(method)) return true;

    const user = req.user;
    if (!user) return true;
    if (user.role === 'super_admin') return true;

    const branchId: string | undefined =
      req.body?.branchId ||
      req.params?.branchId ||
      user.branchId;

    if (!branchId) return true;

    const branch = await this.branchRepo.findOne({
      where: { id: branchId, clinicId: user.clinicId },
      select: ['id', 'status', 'isLocked', 'isActive'],
    });

    if (!branch) return true;

    // Legacy isLocked check (backward compat)
    if (branch.isLocked) {
      throw new ForbiddenException({
        code:    'BRANCH_LOCKED',
        message:
          'This branch is locked because your subscription quota has been reduced. ' +
          'Upgrade your plan to unlock and resume operations.',
        branchId,
      });
    }

    if (branch.status === BranchStatus.PENDING_SELECTION) {
      throw new ForbiddenException({
        code:    'BRANCH_PENDING_SELECTION',
        message:
          'This branch is temporarily suspended while your plan downgrade is being processed. ' +
          'Please complete your branch selection to continue using this branch.',
        branchId,
      });
    }

    if (branch.status === BranchStatus.INACTIVE || !branch.isActive) {
      throw new ForbiddenException({
        code:    'BRANCH_INACTIVE',
        message: 'This branch is inactive. Reactivate it before making changes.',
        branchId,
      });
    }

    return true;
  }
}
