// src/sync/sync-context.ts
//
// PendingSyncSubscriber (and the Repository.update patch) need to tell the
// difference between:
//   (a) a normal local write from ordinary business logic — should be
//       marked syncStatus='pending' so it gets pushed later, and
//   (b) SyncService itself writing an incoming record during a pull, or
//       confirming a push result — already carries the correct syncStatus
//       ('synced'/'conflict') and must NOT be re-marked 'pending', or
//       every pull would immediately re-queue itself for push forever.
//
// AsyncLocalStorage is used instead of inspecting the entity/payload shape
// because it's unambiguous and doesn't depend on guessing which fields a
// caller happened to set. SyncService wraps its own writes in
// runInsideSyncApply(); everything else is a normal write by default.

import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage<boolean>();

export function isInsideSyncApply(): boolean {
  return storage.getStore() === true;
}

export function runInsideSyncApply<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run(true, fn);
}
