import { TokenType } from '@grantjs/schema';
import { Request, Response, NextFunction } from 'express';

import { ContextRequest } from '@/types';

import { isAuthenticatedRest } from './auth-guard';

export interface EmailVerificationRestGuardOptions {
  allowPersonalContext?: boolean;
}

export function requireEmailVerificationRest(options: EmailVerificationRestGuardOptions = {}) {
  const { allowPersonalContext = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const contextReq = req as ContextRequest;

    if (!isAuthenticatedRest(req)) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' });
    }

    const { user, handlers } = contextReq.context;

    if (user!.type === TokenType.ApiKey || user!.isVerified) {
      return next();
    }

    if (allowPersonalContext) {
      const scope = user!.scope ?? null;
      if (scope && (await handlers.auth.isPersonalScope(scope))) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
  };
}
