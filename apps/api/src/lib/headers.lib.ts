import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from '@grantjs/constants';
import { Request } from 'express';
import { IncomingHttpHeaders } from 'http';
import { isIP } from 'net';

import { config } from '@/config';

export interface ContextHeaders {
  origin: string;
  userAgent: string | null;
  authorization: string | null;
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Strips the port from an edge-supplied address, validating rather than guessing.
 *
 * `CloudFront-Viewer-Address` is `<ip>:<port>`, and for IPv6 the address itself
 * contains colons — `2001:db8::1:54321` — so the port is after the *last* colon, not
 * the first. Splitting on the first would truncate every IPv6 client to `2001`,
 * collapsing them into a single rate-limit bucket.
 *
 * Splitting on the last colon unconditionally is wrong in the other direction: a bare
 * `2001:db8::1` would become `2001:db8:`. So the remainder is checked with `isIP` and
 * only used when it is genuinely an address, and a value that is already a valid IP is
 * returned untouched — which also lets this config point at a header that carries no
 * port at all.
 *
 * One case stays ambiguous and no heuristic resolves it: `2001:db8::1:8443` is a valid
 * IPv6 address *and* a plausible address:port, because a four-digit decimal port is
 * also a valid hex group. Those are left whole, so such a client is keyed per
 * connection rather than per address — weaker limiting for a minority of IPv6 callers,
 * against a header that is spoofable by everyone today. Bracketed notation would
 * settle it, and CloudFront does not use it.
 */
function stripPort(address: string): string {
  if (isIP(address)) return address;

  const lastColon = address.lastIndexOf(':');
  if (lastColon === -1) return address;

  const candidate = address.slice(0, lastColon);
  return isIP(candidate) ? candidate : address;
}

/**
 * The client IP as reported by headers.
 *
 * `x-forwarded-for` is read as the **first** entry, which is correct behind a proxy
 * that builds the chain itself and wrong behind one that appends to whatever the
 * client sent. CloudFront appends: a request carrying `X-Forwarded-For: 1.2.3.4`
 * arrives as `1.2.3.4, <real client>`, so the first entry is attacker-controlled. That
 * matters because this value keys the rate limiter
 * (`middleware/rate-limit.middleware.ts`) and is recorded as `ipAddress` on the
 * request context — a spoofable value means a limiter that can be evaded by rotating
 * a header, and audit records naming whichever IP the caller chose.
 *
 * `SECURITY_TRUSTED_CLIENT_IP_HEADER` names a header the edge is known to *overwrite*
 * rather than append to, and when set it is used exclusively — no fallback to
 * `x-forwarded-for`, because falling back would restore the bypass whenever the
 * trusted header were absent. Unset, everything below behaves exactly as before.
 */
function getClientIpFromHeaders(headers: IncomingHttpHeaders): string | null {
  const trustedHeader = config.security.trustedClientIpHeader;
  if (trustedHeader) {
    const trusted = firstHeaderValue(headers[trustedHeader]);
    return trusted ? stripPort(trusted.trim()) : null;
  }

  const forwardedFor = firstHeaderValue(headers['x-forwarded-for']);
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return firstHeaderValue(headers['x-real-ip']);
}

export function getClientIp(req: Request): string | null {
  const headerIp = getClientIpFromHeaders(req.headers);
  if (headerIp) {
    return headerIp;
  }

  if (req.ip) {
    return req.ip;
  }

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return null;
}

function getOrigin(headers: IncomingHttpHeaders): string {
  return headers['origin'] || headers['host'] || 'unknown';
}

function getUserAgent(headers: IncomingHttpHeaders): string | null {
  return headers['user-agent'] || null;
}

function getAuthorization(headers: IncomingHttpHeaders): string | null {
  return headers['authorization'] || null;
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

function getAuthorizationFromCookie(req: Request): string | null {
  if (req.cookies?.[AUTH_ACCESS_TOKEN_KEY]) {
    return req.cookies[AUTH_ACCESS_TOKEN_KEY];
  }

  if (req.headers.cookie) {
    const cookies = parseCookieHeader(req.headers.cookie);
    return cookies[AUTH_ACCESS_TOKEN_KEY] || null;
  }

  return null;
}

/** Read refresh token from cookie (for cookie-based refresh). */
export function getRefreshTokenFromCookie(req: Request): string | null {
  if (req.cookies?.[AUTH_REFRESH_TOKEN_KEY]) {
    return req.cookies[AUTH_REFRESH_TOKEN_KEY];
  }

  if (req.headers.cookie) {
    const cookies = parseCookieHeader(req.headers.cookie);
    return cookies[AUTH_REFRESH_TOKEN_KEY] || null;
  }

  return null;
}

export function getAuthorizationToken(req: Request): string | null {
  const headerAuth = getAuthorization(req.headers);
  if (headerAuth) {
    return headerAuth;
  }

  const cookieToken = getAuthorizationFromCookie(req);
  if (cookieToken) {
    return `Bearer ${cookieToken}`;
  }

  return null;
}

export function getContextHeaders(headers: IncomingHttpHeaders): ContextHeaders {
  return {
    origin: getOrigin(headers),
    userAgent: getUserAgent(headers),
    authorization: getAuthorization(headers),
  };
}

/**
 * Build the request base URL (protocol + host) for issuer, callbacks, etc.
 * Precedence: X-Forwarded-Proto, X-Forwarded-Host (when behind gateway), then Host, then APP_URL fallback.
 * Compatible with nginx, Traefik, Cloudflare, k8s ingress, Fly, Render, Railway.
 */
export function getRequestBaseUrl(req: Request): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || req.protocol;
  const host =
    (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
    req.get('host');
  if (host) {
    const base = `${proto}://${host}`.replace(/\/$/, '');
    return base;
  }
  return config.app.url.replace(/\/$/, '');
}
