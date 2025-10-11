import { db } from '@logusgraphics/grant-database';
import { NextFunction, Response } from 'express';

import { createHandlers } from '@/handlers';
import { createRepositories } from '@/repositories';
import { createServices } from '@/services';
import { AuthenticatedRequest, ContextRequest } from '@/types';

/**
 * Middleware that creates and injects the request context
 * Should be used after authMiddleware to get the user
 */
export function contextMiddleware(scopeCache: any) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const headers = req.headers;
    const origin = headers['origin'] || headers['host'];

    if (!origin) {
      return res.status(400).json({
        error: 'Origin is required',
        code: 'BAD_USER_INPUT',
      });
    }

    const repositories = createRepositories(db);
    const services = createServices(repositories, req.user || null, db);
    const handlers = createHandlers(scopeCache, services, db);

    (req as ContextRequest).context = {
      user: req.user || null,
      handlers,
      origin,
    };

    next();
  };
}
