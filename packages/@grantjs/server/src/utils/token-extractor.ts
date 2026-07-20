import type { GrantServerConfig } from '../types';

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Parse cookie header string into key-value pairs
 */
function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

/**
 * Extract token from cookies
 */
export function extractTokenFromCookies(
  cookieHeader: string | undefined,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  return cookies[cookieName] || null;
}

/**
 * Extract token from Express request
 */
export async function extractTokenFromRequest(
  request: unknown,
  config: GrantServerConfig
): Promise<string | null> {
  // Use custom token resolver if provided
  if (config.getToken) {
    const token = await config.getToken(request);
    if (token) return token;
  }

  // Try to extract from request (Express-style or Web API / NextRequest)
  const req = request as {
    headers?:
      { authorization?: string; cookie?: string } | { get: (name: string) => string | null };
    cookies?: Record<string, string>;
  };

  if (!req?.headers) return null;

  // Web API Headers (NextRequest, Request): headers.get(name)
  const headersGet = (req.headers as { get?: (name: string) => string | null }).get;
  if (typeof headersGet === 'function') {
    const authHeader = headersGet.call(req.headers, 'authorization');
    const bearerToken = extractBearerToken(authHeader ?? undefined);
    if (bearerToken) return bearerToken;
    const cookieName = config.cookieName || 'grant-access-token';
    const cookieHeader = headersGet.call(req.headers, 'cookie');
    if (cookieHeader) {
      const cookieToken = extractTokenFromCookies(cookieHeader, cookieName);
      if (cookieToken) return cookieToken;
    }
    return null;
  }

  // Express-style: headers.authorization, headers.cookie
  const plainHeaders = req.headers as { authorization?: string; cookie?: string };
  const authHeader = plainHeaders.authorization;
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) return bearerToken;

  const cookieName = config.cookieName || 'grant-access-token';

  if (req.cookies?.[cookieName]) {
    return req.cookies[cookieName];
  }

  const cookieHeader = plainHeaders.cookie;
  if (cookieHeader) {
    const cookieToken = extractTokenFromCookies(cookieHeader, cookieName);
    if (cookieToken) return cookieToken;
  }

  return null;
}
