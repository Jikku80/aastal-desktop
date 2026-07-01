// src/sync/pending-sync-repository.patch.ts
//
// Repository.update(criteria, partial) compiles straight to a raw SQL
// UPDATE — by TypeORM's own design it does NOT run entity subscribers,
// listeners, or @UpdateDateColumn lifecycle hooks. That's the fast path,
// and it's what ~90% of write call sites in this codebase use for partial
// updates (patients.service.ts, billing.service.ts, appointments.service.ts,
// and around 80 others — see the audit in the sync diagnosis).
//
// PendingSyncSubscriber (beforeUpdate) only ever sees .save()-based writes,
// so on its own it would miss the majority of edits in the app. Rather than
// touching every one of those ~85 call sites by hand (high risk of missing
// one, and this pattern will keep getting used in new code), this patches
// Repository.prototype.update ONCE, at bootstrap, to transparently add
// { syncStatus: 'pending', updatedAt: new Date() } to the partial payload
// for any SYNC_REGISTRY entity — but only on the offline sqlite instance,
// and only when the caller hasn't already set syncStatus explicitly
// (SyncService's own applyIncoming/pushPending calls always do, e.g.
// `{ syncStatus: 'conflict' }` — those must pass through untouched).
//
// This only ever affects Repository instances process-wide, and is only
// installed when DB_DRIVER === 'sqlite' (see isOfflineSqlite()), so the
// hosted Postgres deployment's behavior is completely unchanged — it never
// calls installPendingSyncRepositoryPatch().

import { Repository, UpdateResult } from 'typeorm';
import { Logger } from '@nestjs/common';
import { SYNC_ENTITY_NAMES, isOfflineSqlite, pendingSyncFields } from './pending-sync.util';
import { isInsideSyncApply } from './sync-context';

const logger = new Logger('PendingSyncRepositoryPatch');
let installed = false;

export function installPendingSyncRepositoryPatch(): void {
  if (!isOfflineSqlite()) return; // never touch Repository.prototype on the hosted server
  if (installed) return;
  installed = true;

  const originalUpdate = Repository.prototype.update;

  Repository.prototype.update = function patchedUpdate(
    this: Repository<any>,
    criteria: any,
    partialEntity: any,
  ): Promise<UpdateResult> {
    const entityName = this.metadata?.name;
    if (
      entityName &&
      SYNC_ENTITY_NAMES.has(entityName) &&
      !isInsideSyncApply() &&
      partialEntity &&
      typeof partialEntity === 'object' &&
      !('syncStatus' in partialEntity)
    ) {
      // pendingSyncFields() only adds `updatedAt` for entities that actually
      // have that column (see its doc comment) — safe for append-only
      // entities too.
      partialEntity = { ...partialEntity, ...pendingSyncFields(entityName) };
    }
    return originalUpdate.call(this, criteria, partialEntity);
  };

  logger.log('Installed: Repository.update() now marks SYNC_REGISTRY entities pending for outbound sync');
}
