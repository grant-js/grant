/**
 * Whether `expiresAt` falls on a UTC calendar day that is **tomorrow or later**
 * (strictly after today's UTC date). Used for API key expiration minimum.
 */
export function isUtcCalendarDateAtLeastTomorrow(expiresAt: Date): boolean {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expUtc = Date.UTC(
    expiresAt.getUTCFullYear(),
    expiresAt.getUTCMonth(),
    expiresAt.getUTCDate()
  );
  return expUtc > todayUtc;
}
