/**
 * Returns the correct case-insensitive LIKE operator for the current DB driver.
 * PostgreSQL uses ILIKE; SQLite's LIKE is case-insensitive by default.
 */
export function ilike(): string {
  return process.env.DB_DRIVER === 'sqlite' ? 'LIKE' : 'ILIKE';
}
