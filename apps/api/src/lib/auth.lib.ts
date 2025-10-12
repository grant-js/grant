import jwt from 'jsonwebtoken';

import type { JwtPayload } from 'jsonwebtoken';

import { config } from '@/config';
import { AuthenticatedUser } from '@/types';

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
      console.warn('JWT token missing required field (aud)');
      return null;
    }

    if (!id) {
      console.warn('JWT token missing required field (sub)');
      return null;
    }

    return {
      id,
      aud,
    };
  } catch (error) {
    console.warn(
      'JWT token verification failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}
