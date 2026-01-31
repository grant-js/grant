import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCacheAdapter } from '@/lib/cache/adapters/in-memory-cache.adapter';
import { rateLimitMiddleware } from '@/middleware/rate-limit.middleware';

type MockSecurity = {
  enableRateLimit: boolean;
  rateLimitMax: number;
  rateLimitWindowMinutes: number;
  rateLimitAuthMax: number;
  rateLimitAuthWindowMinutes: number;
};

const { mockSecurity } = vi.hoisted(() => {
  const security: MockSecurity = {
    enableRateLimit: true,
    rateLimitMax: 5,
    rateLimitWindowMinutes: 15,
    rateLimitAuthMax: 2,
    rateLimitAuthWindowMinutes: 15,
  };
  return { mockSecurity: security };
});

vi.mock('@/config', () => ({
  config: { security: mockSecurity },
}));

vi.mock('@/lib/headers.lib', () => ({
  getClientIp: vi.fn(() => '192.168.1.1'),
}));

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/some-route',
    headers: {},
    ...overrides,
  } as Request;
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
});
