import { NextFunction, Response } from 'express';

import { extractUserFromCookie, extractUserFromToken } from '@/lib/auth.lib';
import { AuthenticationError } from '@/lib/errors';
import { AuthenticatedRequest } from '@/types';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieHeader = req.headers.cookie;

  let user = extractUserFromToken(authHeader || null);

  if (!user) {
    user = extractUserFromCookie(cookieHeader);
  }

  if (authHeader && authHeader.startsWith('Bearer ') && !user) {
    throw new AuthenticationError(
      'Invalid or expired authentication token',
      'errors:auth.invalidToken'
    );
  }

  req.user = user;
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
  }
  next();
}
