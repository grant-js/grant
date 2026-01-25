import { IncomingHttpHeaders } from 'http';

import { AUTH_ACCESS_TOKEN_KEY } from '@grantjs/constants';
import { Request } from 'express';

export interface ContextHeaders {
  origin: string;
  userAgent: string | null;
  authorization: string | null;
}

export function getClientIpFromHeaders(headers: IncomingHttpHeaders): string | null {
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

export function getOrigin(headers: IncomingHttpHeaders): string {
  return headers['origin'] || headers['host'] || 'unknown';
}

export function getUserAgent(headers: IncomingHttpHeaders): string | null {
  return headers['user-agent'] || null;
}

export function getAuthorization(headers: IncomingHttpHeaders): string | null {
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

export function getAuthorizationFromCookie(req: Request): string | null {
  if (req.cookies?.[AUTH_ACCESS_TOKEN_KEY]) {
    return req.cookies[AUTH_ACCESS_TOKEN_KEY];
  }

  if (req.headers.cookie) {
    const cookies = parseCookieHeader(req.headers.cookie);
    return cookies[AUTH_ACCESS_TOKEN_KEY] || null;
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
