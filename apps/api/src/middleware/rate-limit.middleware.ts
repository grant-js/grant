import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { ICacheAdapter } from '@/lib/cache';
import { getClientIp } from '@/lib/headers.lib';
import { ContextRequest } from '@/types';

const SKIP_PATHS = new Set(['/health']);

const AUTH_RATE_LIMIT_PATHS = new Set([
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/cli-callback',
  'POST /api/auth/token',
]);

interface WindowState {
  count: number;
  resetAt: number;
}

function sendTooManyRequests(res: Response, retryAfterSeconds: number): void {
  res.setHeader('Retry-After', String(Math.ceil(retryAfterSeconds)));
  res.status(429).json({
    success: false,
    error: {
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
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

export function rateLimitMiddleware(store: ICacheAdapter) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (config.security.enableRateLimit === false) {
      next();
      return;
    }

    const path = req.path;
    if (SKIP_PATHS.has(path)) {
      next();
      return;
    }

    const ip = getClientIp(req) ?? 'unknown';
    const methodPath = `${req.method} ${path}`;
    const isAuthSensitive = AUTH_RATE_LIMIT_PATHS.has(methodPath);
    const now = Date.now();

    try {
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
          sendTooManyRequests(res, retryAfterSeconds);
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
        sendTooManyRequests(res, globalRetry);
        return;
      }

      if (config.security.rateLimitPerTenantEnabled) {
        const contextReq = req as ContextRequest;
        const scope = contextReq.context?.user?.scope ?? null;
        if (scope && typeof scope.tenant === 'string' && typeof scope.id === 'string') {
          const tenantKey = `tenant:${scope.tenant}:${scope.id}`;
          const tenantWindowMs = config.security.rateLimitPerTenantWindowMinutes * 60 * 1000;
          const { allowed: tenantAllowed, retryAfterSeconds: tenantRetry } = await checkLimit(
            store,
            tenantKey,
            tenantWindowMs,
            config.security.rateLimitPerTenantMax,
            now
          );
          if (!tenantAllowed) {
            sendTooManyRequests(res, tenantRetry);
            return;
          }
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
