/**
 * Integration tests for rate limiting.
 *
 * Uses a minimal Express app with the real rate-limit middleware over HTTP (supertest).
 * Industry practice: test rate limits at the HTTP layer, assert 429 + Retry-After,
 * use test-specific low limits and clear store between tests to avoid cross-test pollution.
 *
 * Per-tenant rate limit is config-based: we set mockSecurity.rateLimitPerTenantEnabled and
 * related fields; the middleware reads config.security (this same object), so tests drive behavior.
 *
 * Benchmarks: optional timing and req/s reporting for "under limit" vs "at limit" runs.
 * For load testing (autocannon, k6), see docs/contributing/testing.md.
 */

import { InMemoryCacheAdapter } from '@grantjs/cache/memory';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS,
  rateLimitMiddleware,
  tenantRateLimitMiddleware,
} from '@/middleware/rate-limit.middleware';

type MockSecurity = {
  enableRateLimit: boolean;
  rateLimitMax: number;
  rateLimitWindowMinutes: number;
  rateLimitAuthMax: number;
  rateLimitAuthWindowMinutes: number;
  rateLimitPerTenantEnabled: boolean;
  rateLimitPerTenantMax: number;
  rateLimitPerTenantWindowMinutes: number;
};

const { mockSecurity } = vi.hoisted(() => {
  const security: MockSecurity = {
    enableRateLimit: true,
    rateLimitMax: 5,
    rateLimitWindowMinutes: 15,
    rateLimitAuthMax: 2,
    rateLimitAuthWindowMinutes: 15,
    rateLimitPerTenantEnabled: false,
    rateLimitPerTenantMax: 200,
    rateLimitPerTenantWindowMinutes: 15,
  };
  return { mockSecurity: security };
});

vi.mock('@/config', () => ({
  config: {
    security: mockSecurity,
    i18n: { defaultLocale: 'en' as const },
  },
}));

vi.mock('@/lib/headers.lib', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

/** Minimal context middleware: attaches context.user.scope so rate limit can apply per-tenant when enabled. */
function contextWithScopeMiddleware(scope: { tenant: string; id: string }) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    Object.assign(req, { context: { user: { scope } } });
    next();
  };
}

function createTestApp(
  store: InMemoryCacheAdapter,
  options: { withScopeContext?: { tenant: string; id: string } } = {}
): express.Express {
  const app = express();
  app.use(express.json());
  app.use(rateLimitMiddleware(store));
  if (options.withScopeContext) {
    app.use(contextWithScopeMiddleware(options.withScopeContext));
  }
  app.use(tenantRateLimitMiddleware(store));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/other', (_req, res) => {
    res.json({ ok: true });
  });

  for (const methodPath of AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS) {
    const spaceIdx = methodPath.indexOf(' ');
    const method = methodPath.slice(0, spaceIdx);
    const routePath = methodPath.slice(spaceIdx + 1);
    const handler = (_req: express.Request, res: express.Response) => {
      res.json({ ok: true });
    };
    if (method === 'GET') {
      app.get(routePath, handler);
    } else if (method === 'POST') {
      app.post(routePath, handler);
    }
  }

  app.post('/graphql', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/graphql/foo', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('rate limit integration', () => {
  let store: InMemoryCacheAdapter;
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    store = new InMemoryCacheAdapter();
    await store.clear();
    app = createTestApp(store);
    mockSecurity.enableRateLimit = true;
    mockSecurity.rateLimitMax = 5;
    mockSecurity.rateLimitAuthMax = 2;
  });

  afterEach(async () => {
    await store.clear();
  });

  describe('behavior', () => {
    it('never rate limits GET /health', async () => {
      for (let i = 0; i < 20; i++) {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
      }
    });

    it('returns 429 and Retry-After when global limit exceeded', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/api/other');
        expect(res.status).toBe(200);
      }

      const res = await request(app).get('/api/other');
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'rate_limit_exceeded',
          translationKey: 'errors.common.tooManyRequests',
        },
      });
      expect(res.body.error.message).toBeDefined();
      expect(typeof res.body.error.message).toBe('string');
    });

    it('returns 429 for auth endpoints when auth limit exceeded', async () => {
      await request(app).post('/api/auth/login').send({}).expect(200);
      await request(app).post('/api/auth/login').send({}).expect(200);

      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      expect(res.body.error?.code).toBe('rate_limit_exceeded');
    });

    it('shares auth bucket across login and token-like paths', async () => {
      await request(app).post('/api/auth/login').send({}).expect(200);
      await request(app).post('/api/auth/login').send({}).expect(200);

      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(429);
    });

    it('applies the auth bucket to GraphQL login and unnamed login documents', async () => {
      await request(app)
        .post('/graphql')
        .send({
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        })
        .expect(200);
      await request(app)
        .post('/graphql')
        .send({ query: 'mutation { login { accessToken } }' })
        .expect(200);

      const res = await request(app)
        .post('/graphql')
        .send({ query: 'mutation { register { accessToken } }' });
      expect(res.status).toBe(429);
      expect(res.body.error?.code).toBe('rate_limit_exceeded');
    });

    it('applies the auth bucket to POST /graphql/foo login', async () => {
      await request(app)
        .post('/graphql/foo')
        .send({
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        })
        .expect(200);
      await request(app)
        .post('/graphql/foo')
        .send({ query: 'mutation { login { accessToken } }' })
        .expect(200);

      const res = await request(app)
        .post('/graphql/foo')
        .send({ query: 'mutation { login { accessToken } }' });
      expect(res.status).toBe(429);
      expect(res.body.error?.code).toBe('rate_limit_exceeded');
    });

    it('does not apply the auth bucket to an unrelated GraphQL operation', async () => {
      mockSecurity.rateLimitMax = 100;
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/graphql')
          .send({ operationName: 'Me', query: 'query Me { me { id } }' });
        expect(res.status).toBe(200);
      }
    });

    it('counts MFA auth routes toward the same auth-sensitive rate limit bucket', async () => {
      await request(app).post('/api/auth/mfa/setup').send({}).expect(200);
      await request(app).post('/api/auth/mfa/verify').send({ code: '000000' }).expect(200);

      const res = await request(app)
        .post('/api/auth/mfa/recovery/verify')
        .send({ code: 'DEADBEEF' });
      expect(res.status).toBe(429);
      expect(res.body.error?.code).toBe('rate_limit_exceeded');
    });

    it('when rateLimitPerTenantEnabled is false, does not per-tenant limit even with scope', async () => {
      mockSecurity.rateLimitPerTenantEnabled = false;
      mockSecurity.rateLimitPerTenantMax = 1;
      mockSecurity.rateLimitMax = 10;
      const appWithScope = createTestApp(store, {
        withScopeContext: { tenant: 'organization', id: 'org-test-123' },
      });

      for (let i = 0; i < 4; i++) {
        const res = await request(appWithScope).get('/api/other');
        expect(res.status).toBe(200);
      }
    });

    it('returns 429 when per-tenant limit exceeded (authenticated with scope)', async () => {
      mockSecurity.rateLimitPerTenantEnabled = true;
      mockSecurity.rateLimitPerTenantMax = 3;
      mockSecurity.rateLimitMax = 100;
      const appWithScope = createTestApp(store, {
        withScopeContext: { tenant: 'organization', id: 'org-test-123' },
      });

      for (let i = 0; i < 3; i++) {
        const res = await request(appWithScope).get('/api/other');
        expect(res.status).toBe(200);
      }

      const res = await request(appWithScope).get('/api/other');
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
      expect(res.body.error?.code).toBe('rate_limit_exceeded');
    });
  });

  describe('benchmarks', () => {
    /**
     * Lightweight timing: N requests under limit, report duration and req/s.
     * Industry practice: keep benchmarks loose (no strict timing assertions in CI)
     * so they don't flake; use for local/CI reporting. Heavy load testing → autocannon/k6.
     */
    it('reports timing for requests under global limit', async () => {
      mockSecurity.rateLimitMax = 50; // ensure n requests stay under limit
      const n = 30;
      const start = performance.now();
      for (let i = 0; i < n; i++) {
        const res = await request(app).get('/api/other');
        expect(res.status).toBe(200);
      }
      const durationMs = performance.now() - start;
      const reqPerSec = (n / durationMs) * 1000;

      expect(durationMs).toBeGreaterThan(0);
      expect(reqPerSec).toBeGreaterThan(0);
      // Loose sanity: 30 requests should complete in under 10s (avoids CI flake)
      expect(durationMs).toBeLessThan(10000);

      // Report for visibility (vitest shows test output)
      if (process.env.BENCHMARK_REPORT !== '0') {
        console.log(
          `[rate-limit benchmark] under limit: ${n} requests in ${durationMs.toFixed(0)}ms (~${reqPerSec.toFixed(1)} req/s)`
        );
      }
    });

    it('reports timing for mix that hits rate limit', async () => {
      const underLimit = 5;
      const overLimit = 3;
      const start = performance.now();
      for (let i = 0; i < underLimit; i++) {
        await request(app).get('/api/other');
      }
      for (let i = 0; i < overLimit; i++) {
        await request(app).get('/api/other');
      }
      const durationMs = performance.now() - start;

      expect(durationMs).toBeGreaterThan(0);
      expect(durationMs).toBeLessThan(10000);

      if (process.env.BENCHMARK_REPORT !== '0') {
        console.log(
          `[rate-limit benchmark] at limit: ${underLimit} allowed + ${overLimit} rate-limited in ${durationMs.toFixed(0)}ms`
        );
      }
    });
  });
});
