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

  // Try to extract from Express request
  const req = request as {
    headers?: {
      authorization?: string;
      cookie?: string;
    };
    cookies?: Record<string, string>;
  };

  if (!req?.headers) return null;

  // Try Authorization header first
  const authHeader = req.headers.authorization;
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) return bearerToken;

  // Try cookies
  const cookieName = config.cookieName || 'grant-access-token';

  // Try parsed cookies object (if cookie-parser middleware is used)
  if (req.cookies?.[cookieName]) {
    return req.cookies[cookieName];
  }

  // Try cookie header string
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookieToken = extractTokenFromCookies(cookieHeader, cookieName);
    if (cookieToken) return cookieToken;
  }

  return null;
}
