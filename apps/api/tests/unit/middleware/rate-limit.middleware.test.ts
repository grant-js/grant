import { InMemoryCacheAdapter } from '@grantjs/cache/memory';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware';

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
});
