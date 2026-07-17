// src/auth/live-auth-cache.util.ts
//
// SCALABILITY FIX — JwtStrategy.validate() used to run on EVERY single
// authenticated request: a User lookup plus a UserRole/role/permissions
// join query, unconditionally, before the actual route handler ever ran.
// AuthCacheService (auth-cache.entity.ts) looks like a cache but isn't one
// for this purpose — it's a DB-backed table with up to a 30-day grace
// window, built specifically for the offline-desktop "local DB briefly
// unreachable" fallback, not as a fast path to avoid the DB on a normal
// hosted request. Using it as a general request cache would mean a
// revoked/deactivated account, or a permission change, could still be
// accepted for up to OFFLINE_SESSION_GRACE_DAYS — fine for "desktop lost
// its local SQLite for a minute," not fine as this app's *default*
// behavior for every request from every one of potentially thousands of
// concurrent hosted users.
//
// This is a separate, short-TTL cache sitting in front of that same live
// lookup, built on the app's existing global CacheModule (Redis-backed
// when REDIS_URL is set — see app.module.ts — so it's shared correctly
// across every horizontal instance, not just the process that first
// looked the user up). TTL is governed by the same CACHE_TTL_MS the rest
// of the app already uses (default 60s), bounding how stale a permission
// change or deactivation can appear — and every call site that changes a
// user's role/permissions/active-status below explicitly busts this key
// too, so the common cases (deactivate, role change, permission change)
// take effect immediately rather than waiting out the TTL.

import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

const logger = new Logger('LiveAuthCache');

export const liveAuthCacheKey = (userId: string): string => `auth:live:${userId}`;

/** Call after any write that changes a user's role, permissions, clinic, or active status. */
export async function invalidateLiveAuthCache(cache: Cache, userIds: string | string[]): Promise<void> {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  await Promise.all(
    ids.map((id) =>
      cache.del(liveAuthCacheKey(id)).catch((err: any) => {
        // Never let a cache-invalidation failure block the write that
        // triggered it — worst case the stale entry just lives out its
        // (short) TTL instead of being busted immediately.
        logger.warn(`Failed to invalidate live auth cache for user ${id}: ${err?.message ?? err}`);
      }),
    ),
  );
}