/**
 * Helpers to keep APP_URL and APP_PORT in sync when one is updated in the config UI.
 */

/** Removes a trailing slash from a URL, if present. */
export function normalizeAppUrl(url: string): string {
  const s = url.trim();
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

/**
 * Derives port from an APP_URL string.
 * If the URL has an explicit port, returns it; otherwise returns 443 for https, 80 for http.
 * Invalid or empty URL returns 80 as fallback.
 */
export function getPortFromAppUrl(url: string): number {
  const trimmed = url.trim();
  if (!trimmed) return 80;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.port) return parseInt(parsed.port, 10);
    return parsed.protocol === 'https:' ? 443 : 80;
  } catch {
    return 80;
  }
}

/**
 * Returns a new URL string with the given port.
 * Preserves protocol and host; replaces or adds the port.
 * If url is empty or invalid, returns empty string.
 */
export function setPortInAppUrl(url: string, port: number): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    parsed.port = String(port);
    return normalizeAppUrl(parsed.toString());
  } catch {
    return '';
  }
}
