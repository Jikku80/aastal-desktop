// src/sync/pending-sync.subscriber.ts
//
// Covers Repository.save()-based inserts and updates (Repository.update()
// bypasses TypeORM subscribers by design — see pending-sync-repository.patch.ts
// for that path, and the ~6 QueryBuilder .set() call sites that use neither,
// which are hand-patched with pendingSyncFields() at their call sites).
//
// This is Bug 2 from the diagnosis: every SYNC_REGISTRY entity defaults
// syncStatus to 'synced' and nothing ever flipped it to 'pending' on a
// local write, so pushPending()'s `WHERE syncStatus = 'pending'` query
// never found anything to push, regardless of connectivity.

import {
  EntitySubscriberInterface, EventSubscriber,
  InsertEvent, UpdateEvent, DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SYNC_ENTITY_NAMES, isOfflineSqlite } from './pending-sync.util';
import { isInsideSyncApply } from './sync-context';

@Injectable()
@EventSubscriber()
export class PendingSyncSubscriber implements EntitySubscriberInterface {
  constructor(@InjectDataSource() private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return undefined as any; // listen to all entities, filter inside each hook
  }

  beforeInsert(event: InsertEvent<any>): void {
    if (!isOfflineSqlite() || isInsideSyncApply()) return;
    if (!SYNC_ENTITY_NAMES.has(event.metadata.name)) return;
    if (event.entity) event.entity.syncStatus = 'pending';
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    if (!isOfflineSqlite() || isInsideSyncApply()) return;
    if (!SYNC_ENTITY_NAMES.has(event.metadata.name)) return;
    // event.entity is the full post-mutation object being saved — always
    // stamp it pending here. (Unlike an insert, we can't tell "explicitly
    // set by caller" from "just carried over from the loaded row" by
    // looking at the value alone — a loaded entity already has
    // syncStatus='synced' sitting on it from the read. isInsideSyncApply()
    // above is what actually distinguishes SyncService's own writes; every
    // other .save() on an existing row is a genuine local edit.)
    if (event.entity) event.entity.syncStatus = 'pending';
  }
}
