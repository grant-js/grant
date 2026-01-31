import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { ICacheAdapter } from '@/lib/cache';
import { getClientIp } from '@/lib/headers.lib';

/** Paths that must not be rate limited (e.g. health for load balancers) */
const SKIP_PATHS = new Set(['/health']);

/** Sensitive auth endpoints with stricter limits (method + path) */
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

/**
 * Global and auth-specific rate limit middleware.
 * Uses the shared cache (memory or Redis) so limits are consistent across instances when Redis is used.
 * - Skips /health (and similar) so load balancers keep working.
 * - For POST /api/auth/login, refresh, cli-callback, token: applies stricter auth limit per IP.
 * - For all other requests (when rate limit enabled): applies global limit per IP.
 * Keys by IP (uses X-Forwarded-For / X-Real-IP when present, else req.ip / socket).
 *
 * @param store - Cache adapter for rate limit state (e.g. cache.rateLimit from CacheFactory). Use same cache strategy as the rest of the app so multi-instance deployments share limits via Redis.
 */
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
    const authKey = `auth:${ip}`;
    const globalKey = `global:${ip}`;
    const now = Date.now();

    try {
      // Stricter limit for auth endpoints (single bucket per IP across login/refresh/cli-callback/token)
      if (isAuthSensitive) {
        const authWindowMs = config.security.rateLimitAuthWindowMinutes * 60 * 1000;
        const authWindowSeconds = Math.ceil(authWindowMs / 1000);
        const existingAuth = await store.get<WindowState>(authKey);
        const authState: WindowState =
          existingAuth && existingAuth.resetAt > now
            ? { count: existingAuth.count + 1, resetAt: existingAuth.resetAt }
            : { count: 1, resetAt: now + authWindowMs };

        await store.set(authKey, authState, authWindowSeconds);

        if (authState.count > config.security.rateLimitAuthMax) {
          const retryAfterSeconds = (authState.resetAt - now) / 1000;
          sendTooManyRequests(res, retryAfterSeconds);
          return;
        }
      }

      // Global limit
      const globalWindowMs = config.security.rateLimitWindowMinutes * 60 * 1000;
      const globalWindowSeconds = Math.ceil(globalWindowMs / 1000);
      const existingGlobal = await store.get<WindowState>(globalKey);
      const globalState: WindowState =
        existingGlobal && existingGlobal.resetAt > now
          ? { count: existingGlobal.count + 1, resetAt: existingGlobal.resetAt }
          : { count: 1, resetAt: now + globalWindowMs };

      await store.set(globalKey, globalState, globalWindowSeconds);

      if (globalState.count > config.security.rateLimitMax) {
        const retryAfterSeconds = (globalState.resetAt - now) / 1000;
        sendTooManyRequests(res, retryAfterSeconds);
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
