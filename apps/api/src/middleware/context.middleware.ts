import { DbSchema } from '@logusgraphics/grant-database';
import { NextFunction, Response } from 'express';

import { createHandlers } from '@/handlers';
import { getLocale } from '@/i18n';
import { IEntityCacheAdapter } from '@/lib/cache/cache-adapter.interface';
import { createRepositories } from '@/repositories';
import { createServices } from '@/services';
import { AuthenticatedRequest, ContextRequest } from '@/types';

function getClientIp(req: AuthenticatedRequest): string | null {
  // Check for IP in X-Forwarded-For header (for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check for X-Real-IP header (common in nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to Express's req.ip (requires trust proxy to be set)
  return req.ip || null;
}

export function contextMiddleware(db: DbSchema, scopeCache: IEntityCacheAdapter) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const headers = req.headers;
    const origin = headers['origin'] || headers['host'] || 'unknown';
    const userAgent = headers['user-agent'] || null;
    const ipAddress = getClientIp(req);

    const locale = getLocale(req);
    const repositories = createRepositories(db);
    const services = createServices(repositories, req.user || null, db);
    const handlers = createHandlers(scopeCache, services, db);

    (req as ContextRequest).context = {
      user: req.user || null,
      handlers,
      origin,
      locale,
      userAgent,
      ipAddress,
    };

    next();
  };
}
