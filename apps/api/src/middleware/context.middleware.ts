import { Grant } from '@grantjs/core';
import { DbSchema, signingKeyAuditLogs } from '@grantjs/database';
import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { SYSTEM_USER } from '@/constants/system.constants';
import { createHandlers } from '@/handlers';
import { getLocale } from '@/i18n';
import { DrizzleAuditLogger } from '@/lib/audit';
import { extractScopeFromRequest } from '@/lib/authorization/scope-extractor';
import { IEntityCacheAdapter } from '@/lib/cache';
import { getAuthorizationToken, getClientIp, getContextHeaders } from '@/lib/headers.lib';
import { JwtTokenProvider } from '@/lib/token';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';
import { createRepositories } from '@/repositories';
import { GrantRepository } from '@/repositories/grant.repository';
import { createResourceResolvers } from '@/resource-resolvers';
import { createServices } from '@/services';
import { GrantService } from '@/services/grant.service';
import { SigningKeyService } from '@/services/signing-keys.service';
import { ContextRequest } from '@/types';

const tokenProvider = new JwtTokenProvider();

/** Context middleware: builds Grant with GrantService (RS256 only; keys from DB via grantService). */
export function contextMiddleware(db: DbSchema, cache: IEntityCacheAdapter) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const headers = req.headers;
    const { origin, userAgent } = getContextHeaders(headers);
    const locale = getLocale(req);
    const ipAddress = getClientIp(req);

    const repositories = createRepositories(db);
    const grantRepository = new GrantRepository(db);

    const signingKeyAudit = new DrizzleAuditLogger(
      signingKeyAuditLogs,
      'signingKeyId',
      SYSTEM_USER,
      db
    );
    const signingKeyService = new SigningKeyService(
      repositories.signingKeyRepository,
      signingKeyAudit
    );

    const grantService = new GrantService(cache, grantRepository, signingKeyService, {
      cacheTtlSeconds: config.jwt.systemSigningKeyCacheTtlSeconds,
    });

    const grant = new Grant(grantService, tokenProvider);

    const authToken = getAuthorizationToken(req);
    const requestScope = extractScopeFromRequest(req);

    await grant.authenticate(authToken, requestScope);

    const user = grant.auth;

    const services = createServices(repositories, user, db, cache, grant);
    const txConnection = new DrizzleTransactionalConnection(db);
    const handlers = createHandlers(cache, services, txConnection);
    const resourceResolvers = createResourceResolvers();

    (req as ContextRequest).context = {
      grant,
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
