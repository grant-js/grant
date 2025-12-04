import { AUTH_ACCESS_TOKEN_KEY } from '@logusgraphics/grant-constants';
import jwt from 'jsonwebtoken';

import { config } from '@/config';
import { createModuleLogger } from '@/lib/logger';
import { AuthenticatedUser } from '@/types';

import type { JwtPayload } from 'jsonwebtoken';

const logger = createModuleLogger('auth');

function extractUserFromJwtToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const aud = decoded.aud as string;
    const id = decoded.sub as string;

    if (!aud) {
      logger.warn({
        msg: 'JWT token missing required field (aud)',
      });
      return null;
    }

    if (!id) {
      logger.warn({
        msg: 'JWT token missing required field (sub)',
      });
      return null;
    }

    return {
      id,
      aud,
    };
  } catch (error) {
    logger.warn({
      msg: 'JWT token verification failed',
      err: error,
    });
    return null;
  }
}

export function extractUserFromToken(authHeader: string | null): AuthenticatedUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return extractUserFromJwtToken(token);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      try {
        cookies[name] = decodeURIComponent(rest.join('='));
      } catch {
        cookies[name] = rest.join('=');
      }
    }
  });

  return cookies;
}

export function extractUserFromCookie(cookieHeader: string | undefined): AuthenticatedUser | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);
  const accessToken = cookies[AUTH_ACCESS_TOKEN_KEY];

  if (!accessToken) {
    return null;
  }

  return extractUserFromJwtToken(accessToken);
}
