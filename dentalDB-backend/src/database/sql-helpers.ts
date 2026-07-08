/**
 * Returns the correct case-insensitive LIKE operator for the current DB driver.
 * PostgreSQL uses ILIKE; SQLite's LIKE is case-insensitive by default.
 */
export function ilike(): string {
  return process.env.DB_DRIVER === 'sqlite' ? 'LIKE' : 'ILIKE';
}

/**
 * Takes a Postgres advisory transaction lock on `lockKey`, but only on Postgres.
 * `pg_advisory_xact_lock` doesn't exist in SQLite and would throw on every call.
 *
 * On SQLite this is a no-op: SQLite serializes writers on a single-file DB by
 * default, and the Electron desktop app is single-process/single-user per
 * install, so cross-connection advisory locking isn't needed there at all.
 * On Postgres it's still required for correctness on the hosted multi-tenant
 * backend, where multiple connections can race on the same sequence.
 */
export async function withAdvisoryLock(
  manager: { query: (sql: string, params?: any[]) => Promise<any> },
  lockKey: number,
): Promise<void> {
  if (process.env.DB_DRIVER === 'sqlite') return;
  await manager.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);
}
