import { Grant } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { createHandlers } from '@/handlers';
import { getLocale } from '@/i18n';
import { IEntityCacheAdapter } from '@/lib/cache';
import { getAuthorizationToken, getClientIp, getContextHeaders } from '@/lib/headers.lib';
import { createRepositories } from '@/repositories';
import { GrantRepository } from '@/repositories/grant.repository';
import { createResourceResolvers } from '@/resource-resolvers';
import { createServices } from '@/services';
import { GrantService } from '@/services/grant.service';
import { ContextRequest } from '@/types';

export function contextMiddleware(db: DbSchema, cache: IEntityCacheAdapter) {
  return (req: Request, res: Response, next: NextFunction) => {
    const headers = req.headers;
    const { origin, userAgent } = getContextHeaders(headers);
    const locale = getLocale(req);
    const ipAddress = getClientIp(req);

    const repositories = createRepositories(db);

    const grantRepository = new GrantRepository(db);
    const grantService = new GrantService(grantRepository);
    const grant = new Grant({ jwtSecret: config.jwt.secret, grantService });

    const authToken = getAuthorizationToken(req);

    try {
      grant.authenticate(authToken);
    } catch {
      grant.auth = null;
    }

    const user = grant.auth;

    const services = createServices(repositories, user, db, cache, grant);
    const handlers = createHandlers(cache, services, db);
    const resourceResolvers = createResourceResolvers();

    (req as ContextRequest).context = {
      user,
      handlers,
      resourceResolvers,
      origin,
      locale,
      userAgent,
      ipAddress,
    };

    next();
  };
}
