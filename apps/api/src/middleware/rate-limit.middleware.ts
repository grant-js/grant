import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { t } from '@/i18n';
import { ICacheAdapter } from '@/lib/cache';
import {
  countSetEmailGraphqlOperations,
  isAuthSensitiveGraphqlRequest,
  isGraphqlHttpPath,
} from '@/lib/graphql-auth-rate-limit.lib';
import { getClientIp } from '@/lib/headers.lib';
import { createLogger } from '@/lib/logger';
import { ContextRequest } from '@/types';

const logger = createLogger('RateLimit');

const SKIP_PATHS = new Set(['/health']);

/**
 * Method + path keys for the shared auth-sensitive rate-limit bucket (IP-based).
 * Exported for tests — keep in sync with middleware matching logic.
 */
export const AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS = [
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/cli-callback',
  'POST /api/auth/token',
  'GET /api/auth/project/authorize',
  'POST /api/auth/project/email/request',
  'POST /api/auth/project/password',
  'POST /api/auth/project/password/mfa',
  'POST /api/auth/project/password/forgot',
  'POST /api/auth/project/password/reset',
  'GET /api/auth/project/consent-info',
  'POST /api/auth/project/consent/approve',
  'POST /api/auth/project/consent/deny',
  'POST /api/auth/project/token',
  'POST /api/auth/mfa/setup',
  'POST /api/auth/mfa/verify',
  'POST /api/auth/mfa/recovery/verify',
  'GET /api/me/mfa/recovery-codes/status',
] as const;

const AUTH_RATE_LIMIT_PATHS = new Set<string>(AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS);

/** `PUT /api/users/:id/email`. Express matches case-insensitively and ignores a trailing slash. */
const SET_EMAIL_REST_PATH = /^\/api\/users\/[^/]+\/email$/;
const CREATE_USER_REST_PATH = '/api/users';

interface WindowState {
  count: number;
  resetAt: number;
}

function sendTooManyRequests(req: Request, res: Response, retryAfterSeconds: number): void {
  res.setHeader('Retry-After', String(Math.ceil(retryAfterSeconds)));
  res.status(429).json({
    success: false,
    error: {
      code: 'rate_limit_exceeded',
      message: t(req, 'errors.common.tooManyRequests'),
      translationKey: 'errors.common.tooManyRequests',
    },
  });
}

async function checkLimit(
  store: ICacheAdapter,
  key: string,
  windowMs: number,
  max: number,
  now: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const existing = await store.get<WindowState>(key);
  const state: WindowState =
    existing && existing.resetAt > now
      ? { count: existing.count + 1, resetAt: existing.resetAt }
      : { count: 1, resetAt: now + windowMs };

  await store.set(key, state, windowSeconds);

  if (state.count > max) {
    return { allowed: false, retryAfterSeconds: (state.resetAt - now) / 1000 };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * How many set-email operations a request runs: `PUT /api/users/:id/email`,
 * `POST /api/users` with an `email`, and the GraphQL `setProjectUserEmail` and
 * `createUser` (with an `email`) mutations. The conflict error of these operations
 * says whether an address is held by any account in the instance, so they are bounded
 * per scope (`tenantRateLimitMiddleware`).
 */
function countSetEmailOperations(req: Request): number {
  const path = req.path.toLowerCase().replace(/\/+$/, '');
  if (req.method === 'PUT' && SET_EMAIL_REST_PATH.test(path)) {
    return 1;
  }
  if (req.method === 'POST' && path === CREATE_USER_REST_PATH) {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return email !== undefined && email !== null ? 1 : 0;
  }
  return countSetEmailGraphqlOperations(req);
}

function shouldBypassRateLimit(req: Request): boolean {
  return config.security.enableRateLimit === false || SKIP_PATHS.has(req.path);
}

/**
 * IP `auth:` / `global:` buckets. Mounted before `contextMiddleware` so a 429 does not
 * authenticate or construct the handler toolbox. GraphQL auth-sensitive detection reads
 * the parsed body — `jsonBodyParser` must stay earlier in the pipeline.
 *
 * Named, not anonymous. Express records `layer.handle.name` and nothing else that
 * identifies a middleware, so a name is what lets the pipeline be asserted from the
 * outside — see `middleware-order.test.ts`. `verifyOrigin` in
 * `origin-verify.middleware.ts` sets the same precedent, and a name in a stack trace
 * is worth having regardless.
 */
export function rateLimitMiddleware(store: ICacheAdapter) {
  return async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (shouldBypassRateLimit(req)) {
      next();
      return;
    }

    const ip = getClientIp(req) ?? 'unknown';
    const methodPath = `${req.method} ${req.path}`;
    const now = Date.now();

    try {
      let isAuthSensitive = AUTH_RATE_LIMIT_PATHS.has(methodPath);
      try {
        isAuthSensitive = isAuthSensitive || isAuthSensitiveGraphqlRequest(req);
      } catch {
        isAuthSensitive = isAuthSensitive || (req.method === 'POST' && isGraphqlHttpPath(req.path));
      }

      if (isAuthSensitive) {
        const authWindowMs = config.security.rateLimitAuthWindowMinutes * 60 * 1000;
        const authKey = `auth:${ip}`;
        const { allowed, retryAfterSeconds } = await checkLimit(
          store,
          authKey,
          authWindowMs,
          config.security.rateLimitAuthMax,
          now
        );
        if (!allowed) {
          sendTooManyRequests(req, res, retryAfterSeconds);
          return;
        }
      }

      const globalWindowMs = config.security.rateLimitWindowMinutes * 60 * 1000;
      const globalKey = `global:${ip}`;
      const { allowed: globalAllowed, retryAfterSeconds: globalRetry } = await checkLimit(
        store,
        globalKey,
        globalWindowMs,
        config.security.rateLimitMax,
        now
      );
      if (!globalAllowed) {
        sendTooManyRequests(req, res, globalRetry);
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * `tenant:` buckets. Keys on `context.user.scope` after authenticate, so it must stay
 * after `contextMiddleware`. A tenant 429 may have paid JWT + one graph; an IP 429
 * must not.
 *
 * - `tenant:<tenant>:<id>` — optional (`SECURITY_RATE_LIMIT_PER_TENANT_*`), every request.
 * - `tenant:<tenant>:<id>:set-email` — on by default (`SECURITY_RATE_LIMIT_SET_EMAIL_*`),
 *   only the operations `countSetEmailOperations` names. Independent of the per-tenant
 *   flag, because the per-tenant bucket is off by default and these operations are what
 *   let a scoped operator test addresses held by accounts in other organizations.
 *   Attempts count whether or not they succeed. Both honour `SECURITY_ENABLE_RATE_LIMIT`.
 */
export function tenantRateLimitMiddleware(store: ICacheAdapter) {
  return async function rateLimitTenant(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const perTenantEnabled = config.security.rateLimitPerTenantEnabled;
    const setEmailEnabled = config.security.rateLimitSetEmailEnabled;
    if (shouldBypassRateLimit(req) || (!perTenantEnabled && !setEmailEnabled)) {
      next();
      return;
    }

    const now = Date.now();

    try {
      const contextReq = req as ContextRequest;
      const scope = contextReq.context?.user?.scope ?? null;
      if (scope && typeof scope.tenant === 'string' && typeof scope.id === 'string') {
        const tenantKey = `tenant:${scope.tenant}:${scope.id}`;

        if (perTenantEnabled) {
          const tenantWindowMs = config.security.rateLimitPerTenantWindowMinutes * 60 * 1000;
          const { allowed: tenantAllowed, retryAfterSeconds: tenantRetry } = await checkLimit(
            store,
            tenantKey,
            tenantWindowMs,
            config.security.rateLimitPerTenantMax,
            now
          );
          if (!tenantAllowed) {
            sendTooManyRequests(req, res, tenantRetry);
            return;
          }
        }

        if (setEmailEnabled) {
          const setEmailWindowMs = config.security.rateLimitSetEmailWindowMinutes * 60 * 1000;
          for (let i = countSetEmailOperations(req); i > 0; i--) {
            const { allowed, retryAfterSeconds } = await checkLimit(
              store,
              `${tenantKey}:set-email`,
              setEmailWindowMs,
              config.security.rateLimitSetEmailMax,
              now
            );
            if (!allowed) {
              // Probing signal: scope only, never the address or the target user.
              logger.warn(
                {
                  tenant: scope.tenant,
                  scopeId: scope.id,
                  max: config.security.rateLimitSetEmailMax,
                },
                'Set-email rate limit exceeded for scope'
              );
              sendTooManyRequests(req, res, retryAfterSeconds);
              return;
            }
          }
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
