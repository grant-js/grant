/**
 * Build DB_URL from Docker/Infra Postgres vars (root .env).
 */

export function computeDbUrlFromPostgres(
  db: string,
  user: string,
  password: string,
  host = 'localhost',
  port = 5432
): string {
  if (!db?.trim() || !user?.trim()) return '';
  const encodedUser = encodeURIComponent(user.trim());
  const encodedPassword = encodeURIComponent(password.trim());
  const encodedDb = encodeURIComponent(db.trim());
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDb}`;
}
