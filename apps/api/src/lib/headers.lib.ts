import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from '@grantjs/constants';
import { Request } from 'express';
import { IncomingHttpHeaders } from 'http';

import { config } from '@/config';

export interface ContextHeaders {
  origin: string;
  userAgent: string | null;
  authorization: string | null;
}

function getClientIpFromHeaders(headers: IncomingHttpHeaders): string | null {
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  const realIp = headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return null;
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
