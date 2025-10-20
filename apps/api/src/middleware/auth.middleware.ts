import { NextFunction, Response } from 'express';

import { extractUserFromToken } from '@/lib/auth.lib';
import { AuthenticationError } from '@/lib/errors';
import { AuthenticatedRequest } from '@/types';

/**
 * Middleware that extracts and validates authentication from the request
 * Injects the user object and audience into the request for downstream middleware
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const user = extractUserFromToken(authHeader || null);

  // If Authorization header is present but user is null, token is invalid
  if (authHeader && authHeader.startsWith('Bearer ') && !user) {
    throw new AuthenticationError(
      'Invalid or expired authentication token',
      'errors:auth.invalidToken'
    );
  }

  req.user = user;
  next();
}

/**
 * Middleware that requires authentication
 * Should be used after authMiddleware
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
  }
  next();
}
