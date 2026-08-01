import { Grant } from '@grantjs/core';
import { DbSchema, signingKeyAuditLogs } from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { SYSTEM_USER } from '@/constants/system.constants';
import { createHandlers } from '@/handlers';
import { getLocale } from '@/i18n';
import { DrizzleAuditLogger } from '@/lib/audit';
import { extractScopeFromRequest } from '@/lib/authorization/scope-extractor';
import { IEntityCacheAdapter } from '@/lib/cache';
import { DrizzleEventPublisher } from '@/lib/events';
import {
  getAuthorizationToken,
  getClientIp,
  getContextHeaders,
  getRequestBaseUrl,
} from '@/lib/headers.lib';
import { hasRlsKeys, scopeToRlsContext, setRlsContext } from '@/lib/rls';
import { JwtTokenProvider } from '@/lib/token';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';
import { getRequestLogger } from '@/middleware/request-logging.middleware';
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
  return async (req: Request, res: Response, next: NextFunction) => {
    const headers = req.headers;
    const { origin, userAgent } = getContextHeaders(headers);
    const requestBaseUrl = getRequestBaseUrl(req);
    const locale = getLocale(req);
    const ipAddress = getClientIp(req);

    // --- Auth phase: uses global db (system-level, no RLS) ---
    const repositories = createRepositories(db);
    const grantRepository = new GrantRepository(db);

    const signingKeyAudit = new DrizzleAuditLogger(
      signingKeyAuditLogs,
      'signingKeyId',
      SYSTEM_USER,
      db
    );
    const bootstrapEvents = new DrizzleEventPublisher(SYSTEM_USER, db);
    const signingKeyService = new SigningKeyService(
      repositories.signingKeyRepository,
      signingKeyAudit,
      bootstrapEvents
    );

    const grantService = new GrantService(cache, grantRepository, signingKeyService, {
      cacheTtlSeconds: config.jwt.systemSigningKeyCacheTtlSeconds,
    });

    const grant = new Grant(grantService, tokenProvider);

    const authToken = getAuthorizationToken(req);
    const requestScope = extractScopeFromRequest(req);

    await grant.authenticate(authToken, requestScope);

    const user = grant.auth;

    // --- Context phase: apply RLS for scoped requests ---
    const scope = user?.scope ?? null;
    const rlsCtx = scope && scope.tenant !== Tenant.System ? scopeToRlsContext(scope) : null;
    const useRls = config.security.enableRls && rlsCtx && hasRlsKeys(rlsCtx);

    if (useRls) {
      // Scoped request: wrap in a transaction with RLS enforcement.
      // SET LOCAL ROLE + set_config are transaction-scoped — no leaking.
      // The transaction stays open until the response finishes (commit) or
      // an unrecoverable error occurs (rollback).
      const afterCommitJobs: Array<() => void | Promise<void>> = [];
      const requestLogger = getRequestLogger(req);

      const scheduleAfterCommit = (fn: () => void | Promise<void>) => {
        afterCommitJobs.push(fn);
      };

      db.transaction(async (tx) => {
        await setRlsContext(tx, rlsCtx);

        const scopedDb = tx as unknown as DbSchema;
        const scopedRepositories = createRepositories(scopedDb);
        const services = createServices(scopedRepositories, user, scopedDb, cache, grant, {
          scheduleAfterCommit,
        });
        const txConnection = new DrizzleTransactionalConnection(scopedDb);
        const handlers = createHandlers(cache, services, txConnection, grant, {
          scheduleAfterCommit,
        });
        const resourceResolvers = createResourceResolvers();

        (req as ContextRequest).context = {
          grant,
          user,
          handlers,
          resourceResolvers,
          scheduleAfterCommit,
          requestLogger,
          origin,
          requestBaseUrl,
          locale,
          userAgent,
          ipAddress,
        };

        // Keep the transaction open until the response completes.
        // res 'finish' fires after the last byte is written; 'close' fires
        // if the connection is terminated early. Either way the transaction
        // should commit (RLS only filters reads/writes; partial-mutation
        // rollback is handled by handler-level savepoints as before).
        return new Promise<void>((resolve) => {
          let transactionResolved = false;
          const completeTransaction = () => {
            if (transactionResolved) return;
            transactionResolved = true;
            resolve();
          };

          res.on('finish', () => {
            completeTransaction();
          });
          res.on('close', () => {
            completeTransaction();
          });
          next();
        });
      })
        .then(() => {
          // Run after Drizzle's transaction promise settles (COMMIT finished). Queue workers
          // and other pool connections must not run until the row is visible.
          if (afterCommitJobs.length === 0) return;
          void Promise.all(afterCommitJobs.map((fn) => Promise.resolve(fn()))).catch(
            (err: unknown) => {
              requestLogger.error({ err }, 'scheduleAfterCommit callback failed');
            }
          );
        })
        .catch(next);
    } else {
      // Unscoped / system / RLS-disabled: no transaction, use global db.
      const scheduleAfterCommit = (fn: () => void | Promise<void>) => {
        void Promise.resolve(fn());
      };

      const services = createServices(repositories, user, db, cache, grant, {
        scheduleAfterCommit,
      });
      const txConnection = new DrizzleTransactionalConnection(db);
      const handlers = createHandlers(cache, services, txConnection, grant, {
        scheduleAfterCommit,
      });
      const resourceResolvers = createResourceResolvers();

      (req as ContextRequest).context = {
        grant,
        user,
        handlers,
        resourceResolvers,
        scheduleAfterCommit,
        requestLogger: getRequestLogger(req),
        origin,
        requestBaseUrl,
        locale,
        userAgent,
        ipAddress,
      };

      next();
    }
  };
}
