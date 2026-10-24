import { InMemoryCacheAdapter } from '@grantjs/cache/memory';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS,
  rateLimitMiddleware,
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

// Per-tenant rate limit is config-based. We test it by mutating mockSecurity; the middleware
// reads config.security (this same object), so toggling rateLimitPerTenantEnabled / rateLimitPerTenantMax
// in tests drives whether and how per-tenant limiting is applied.
vi.mock('@/config', () => ({
  config: { security: mockSecurity },
}));

vi.mock('@/lib/headers.lib', () => ({
  getClientIp: vi.fn(() => '192.168.1.1'),
}));

vi.mock('@/i18n', () => ({
  t: (_req: unknown, key: string) =>
    key === 'errors.common.tooManyRequests' ? 'Too many requests. Please try again later.' : key,
}));

type RequestWithContext = Request & {
  context?: { user?: { scope?: { tenant: string; id: string } } };
};

function createMockReq(overrides: Partial<RequestWithContext> = {}): RequestWithContext {
  return {
    method: 'GET',
    path: '/api/some-route',
    headers: {},
    ...overrides,
  } as RequestWithContext;
}

function createMockRes(): Response {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  return res;
}

describe('rateLimitMiddleware', () => {
  const next = vi.fn();
  const store = new InMemoryCacheAdapter();
  const middleware = rateLimitMiddleware(store);

  beforeEach(async () => {
    vi.clearAllMocks();
    await store.clear();
    mockSecurity.enableRateLimit = true;
    mockSecurity.rateLimitMax = 5;
    mockSecurity.rateLimitAuthMax = 2;
  });

  describe('when rate limiting is disabled', () => {
    it('calls next() and does not limit', async () => {
      mockSecurity.enableRateLimit = false;
      const req = createMockReq();
      const res = createMockRes();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('skip paths', () => {
    it('never rate limits /health', async () => {
      const req = createMockReq({ path: '/health' });
      const res = createMockRes();

      for (let i = 0; i < 10; i++) {
        await middleware(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(10);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('global limit', () => {
    it('calls next() until limit exceeded, then returns 429 with Retry-After', async () => {
      const req = createMockReq({ path: '/api/other' });
      const res = createMockRes();

      for (let i = 0; i < 5; i++) {
        await middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(i + 1);
        expect(res.status).not.toHaveBeenCalled();
      }

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(5); // still 5, not 6
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'rate_limit_exceeded',
            message: 'Too many requests. Please try again later.',
            translationKey: 'errors.common.tooManyRequests',
          }),
        })
      );
    });
  });

  describe('auth endpoint limit', () => {
    it('applies stricter limit to POST /api/auth/login and returns 429 with Retry-After', async () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/auth/login',
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('applies the auth bucket to GraphQL login by operation name', async () => {
      const req = createMockReq({
        method: 'POST',
        path: '/graphql',
        body: {
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        },
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('applies the auth bucket to an unnamed GraphQL login document', async () => {
      const req = createMockReq({
        method: 'POST',
        path: '/graphql',
        body: { query: 'mutation { login { accessToken } }' },
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('shares one auth bucket between REST login and GraphQL refreshSession', async () => {
      const restLogin = createMockReq({ method: 'POST', path: '/api/auth/login' });
      const gqlRefresh = createMockReq({
        method: 'POST',
        path: '/graphql',
        body: {
          operationName: 'refreshSession',
          query: 'mutation refreshSession { refreshSession { accessToken } }',
        },
      });
      const res = createMockRes();

      await middleware(restLogin, res, next);
      await middleware(gqlRefresh, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(restLogin, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('applies the auth bucket to POST /graphql/foo login', async () => {
      const req = createMockReq({
        method: 'POST',
        path: '/graphql/foo',
        body: {
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        },
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('increments a bucket for a cyclic GraphQL document without hanging', async () => {
      mockSecurity.rateLimitMax = 2;
      const req = createMockReq({
        method: 'POST',
        path: '/graphql',
        body: {
          query:
            'fragment A on Mutation { ...B } fragment B on Mutation { ...A } mutation { ...A }',
        },
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalled();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('does not apply the auth bucket to an unrelated GraphQL operation', async () => {
      mockSecurity.rateLimitMax = 100;
      const req = createMockReq({
        method: 'POST',
        path: '/graphql',
        body: { operationName: 'Me', query: 'query Me { me { id } }' },
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('applies same auth bucket to POST /api/auth/token (shared with login)', async () => {
      const reqLogin = createMockReq({
        method: 'POST',
        path: '/api/auth/login',
      });
      const reqToken = createMockReq({
        method: 'POST',
        path: '/api/auth/token',
      });
      const res = createMockRes();

      await middleware(reqLogin, res, next);
      await middleware(reqToken, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(reqLogin, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('project password reset routes (ADR 0011 slice 5)', () => {
    it.each(['/api/auth/project/password/forgot', '/api/auth/project/password/reset'])(
      'limits POST %s per client address with the shared auth bucket',
      async (path) => {
        const req = createMockReq({ method: 'POST', path });
        const res = createMockRes();

        await middleware(req, res, next);
        await middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(2);

        await middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(2);
        expect(res.status).toHaveBeenCalledWith(429);
      }
    );

    it('shares one bucket between requesting a link and completing it', async () => {
      const forgot = createMockReq({ method: 'POST', path: '/api/auth/project/password/forgot' });
      const reset = createMockReq({ method: 'POST', path: '/api/auth/project/password/reset' });
      const res = createMockRes();

      await middleware(forgot, res, next);
      await middleware(forgot, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(reset, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('per-tenant limit (config: mockSecurity.rateLimitPerTenant*)', () => {
    beforeEach(() => {
      mockSecurity.rateLimitPerTenantEnabled = true;
      mockSecurity.rateLimitPerTenantMax = 3;
      mockSecurity.rateLimitPerTenantWindowMinutes = 15;
      mockSecurity.rateLimitMax = 100; // high so global does not trigger first
    });

    it('when rateLimitPerTenantEnabled is false, does not apply per-tenant limit even with scope present', async () => {
      mockSecurity.rateLimitPerTenantEnabled = false;
      mockSecurity.rateLimitPerTenantMax = 1; // if per-tenant were applied we would get 429 on 2nd request
      mockSecurity.rateLimitMax = 100;
      const req = createMockReq({
        path: '/api/other',
        context: {
          user: {
            scope: { tenant: 'organization', id: 'org-123' },
          } as unknown as import('@grantjs/core').GrantAuth,
        },
      });
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 429 when per-tenant limit exceeded and scope is present', async () => {
      const req = createMockReq({
        path: '/api/other',
        context: {
          user: {
            scope: { tenant: 'organization', id: 'org-123' },
          } as unknown as import('@grantjs/core').GrantAuth,
        },
      });
      const res = createMockRes();

      for (let i = 0; i < 3; i++) {
        await middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(i + 1);
      }

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('does not apply per-tenant limit when scope is missing', async () => {
      mockSecurity.rateLimitPerTenantEnabled = true;
      mockSecurity.rateLimitPerTenantMax = 1;
      const req = createMockReq({ path: '/api/other' }); // no context.user.scope
      const res = createMockRes();

      await middleware(req, res, next);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('isolates per-tenant buckets by scope', async () => {
      mockSecurity.rateLimitPerTenantMax = 2;
      const reqA = createMockReq({
        path: '/api/other',
        context: {
          user: {
            scope: { tenant: 'organization', id: 'org-a' },
          } as unknown as import('@grantjs/core').GrantAuth,
        },
      });
      const reqB = createMockReq({
        path: '/api/other',
        context: {
          user: {
            scope: { tenant: 'organization', id: 'org-b' },
          } as unknown as import('@grantjs/core').GrantAuth,
        },
      });
      const res = createMockRes();

      await middleware(reqA, res, next);
      await middleware(reqA, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      await middleware(reqA, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(429);

      next.mockClear();
      (res.status as ReturnType<typeof vi.fn>).mockClear();
      (res.setHeader as ReturnType<typeof vi.fn>).mockClear();

      await middleware(reqB, res, next);
      await middleware(reqB, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it('exports auth-sensitive paths including MFA and project OAuth routes (single source for rate-limit integration)', () => {
    expect([...AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS]).toEqual(
      expect.arrayContaining([
        'POST /api/auth/mfa/setup',
        'POST /api/auth/mfa/verify',
        'POST /api/auth/mfa/recovery/verify',
        'GET /api/me/mfa/recovery-codes/status',
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
      ])
    );
  });
});
