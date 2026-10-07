/** Paths Next rewrites to the API. Rewrites cannot set headers; proxy must. */
const ORIGIN_VERIFY_PROXY_PREFIXES = [
  '/api',
  '/graphql',
  '/health',
  '/storage',
  '/.well-known',
  '/org',
  '/acc',
] as const;

export function shouldInjectOriginVerify(pathname: string): boolean {
  return ORIGIN_VERIFY_PROXY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Server-only secret for the origin gate. Never read `NEXT_PUBLIC_*` —
 * that prefix would ship the header value to the browser.
 */
export function resolveOriginVerifySecret(
  env: Record<string, string | undefined> = process.env
): string | undefined {
  const secret = env.ORIGIN_VERIFY_SECRET?.trim();
  return secret ? secret : undefined;
}

export function resolveOriginVerifyHeaderName(
  env: Record<string, string | undefined> = process.env
): string {
  const name = env.SECURITY_ORIGIN_VERIFY_HEADER?.trim().toLowerCase();
  return name || 'x-origin-verify';
}
