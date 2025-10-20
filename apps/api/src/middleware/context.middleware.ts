import { DbSchema } from '@logusgraphics/grant-database';
import { NextFunction, Response } from 'express';

import { createHandlers } from '@/handlers';
import { IEntityCacheAdapter } from '@/lib/cache/cache-adapter.interface';
import { BadRequestError } from '@/lib/errors';
import { createRepositories } from '@/repositories';
import { createServices } from '@/services';
import { AuthenticatedRequest, ContextRequest } from '@/types';

export function contextMiddleware(db: DbSchema, scopeCache: IEntityCacheAdapter) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const headers = req.headers;
    const origin = headers['origin'] || headers['host'];

    if (!origin) {
      throw new BadRequestError('Origin is required', 'errors:common.originRequired');
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
