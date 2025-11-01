import jwt from 'jsonwebtoken';

import { config } from '@/config';
import { createModuleLogger } from '@/lib/logger';
import { AuthenticatedUser } from '@/types';

import type { JwtPayload } from 'jsonwebtoken';

const logger = createModuleLogger('auth');

export function extractUserFromToken(authHeader: string | null): AuthenticatedUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
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
