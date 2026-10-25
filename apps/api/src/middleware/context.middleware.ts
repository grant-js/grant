import { Grant } from '@grantjs/core';
import { DbSchema, signingKeyAuditLogs } from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { SYSTEM_USER } from '@/constants/system.constants';
import { createHandlers } from '@/handlers';
import { getLocale } from '@/i18n';
import {
  createAfterCommitQueue,
  createImmediateAfterCommit,
  holdResponseEndUntil,
  releaseTransactionThenAfterCommit,
} from '@/lib/after-commit.lib';
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
  return async function requestContext(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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

    const afterCommitOptions = { timeoutMs: config.jobs.afterCommitTimeoutMs };

    if (useRls) {
      // Scoped request: wrap in a transaction with RLS enforcement.
      // SET LOCAL ROLE + set_config are transaction-scoped — no leaking.
      // The transaction stays open until the handler ends the response (commit) or
      // an unrecoverable error occurs (rollback).
      const requestLogger = getRequestLogger(req);
      const afterCommit = createAfterCommitQueue(requestLogger, afterCommitOptions);
      const scheduleAfterCommit = afterCommit.schedule;

      let releaseTransaction: () => void = () => undefined;

      const transactionSettled = db.transaction(async (tx) => {
        await setRlsContext(tx, rlsCtx);

        const scopedDb = tx as unknown as DbSchema;
        const scopedRepositories = createRepositories(scopedDb);
        const services = createServices(scopedRepositories, user, scopedDb, cache, grant, {
          scheduleAfterCommit,
          // The platform credential tables are out of the restricted role's reach.
          baseDb: db,
          // The sign-in lockout counts failures on the pool, outside this transaction.
          durableDb: db,
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

        // Keep the transaction open until the handler ends the response (see
        // holdResponseEndUntil below). 'finish' / 'close' are the fallback for responses
        // that were flushed before end() (streaming) or aborted by the client. Either way
        // the transaction should commit (RLS only filters reads/writes; partial-mutation
        // rollback is handled by handler-level savepoints as before).
        return new Promise<void>((resolve) => {
          releaseTransaction = resolve;
          res.on('finish', resolve);
          res.on('close', resolve);
          next();
        });
      });

      // COMMIT returns the request client to the pool, then after-commit runs on the pool,
      // then the body is flushed. On Lambda the environment is frozen once the response is
      // returned, which silently dropped enqueues that were still in flight. A failed COMMIT
      // reaches the client as an error instead of a success that was never persisted.
      const responseHold = holdResponseEndUntil(res, async () => {
        await releaseTransactionThenAfterCommit(
          () => releaseTransaction(),
          transactionSettled,
          afterCommit
        ).catch(() => undefined);
      });

      transactionSettled.catch((err: unknown) => {
        if (res.headersSent || res.writableEnded) {
          requestLogger.error({ err }, 'Request transaction failed after the response was sent');
          return;
        }
        responseHold.abandon();
        next(err);
      });
    } else {
      // Unscoped / system / RLS-disabled: no transaction, use global db.
      const requestLogger = getRequestLogger(req);
      const afterCommit = createImmediateAfterCommit(requestLogger, afterCommitOptions);
      const scheduleAfterCommit = afterCommit.schedule;
      // No transaction here, so callbacks run at once. The response still waits for them: on
      // Lambda an unfinished SQS SendMessage is lost once the response is returned.
      holdResponseEndUntil(res, () => afterCommit.settled());

      const services = createServices(repositories, user, db, cache, grant, {
        scheduleAfterCommit,
        durableDb: db,
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
        requestLogger,
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
