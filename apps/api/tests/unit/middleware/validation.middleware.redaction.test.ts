import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const logger = vi.hoisted(() => ({ debug: vi.fn(), error: vi.fn() }));

vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => logger,
}));

vi.mock('@/i18n', () => ({
  isTranslationKey: () => false,
  t: (_req: unknown, key: string) => key,
  translateMessage: (_req: unknown, message: string) => message,
}));

const { validateBody } = await import('@/middleware/validation.middleware');

function run(body: unknown, schema: z.ZodSchema) {
  const req = { path: '/p', body } as unknown as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return validateBody(schema)(req, res, next).then(() => ({ req, res, next }));
}

describe('validation middleware body logging', () => {
  it('does not log a password, a code or a token from the request body', async () => {
    logger.debug.mockClear();
    const { next } = await run(
      { email: 'a@b.c', password: 'hunter2-plain', code: '424242', mfa_token: 'tok-secret' },
      z.object({ email: z.string(), password: z.string(), code: z.string(), mfa_token: z.string() })
    );

    expect(next).toHaveBeenCalled();
    const logged = JSON.stringify(logger.debug.mock.calls);
    expect(logged).not.toMatch(/hunter2-plain|424242|tok-secret/);
    expect(logged).toContain('a@b.c');
  });

  it('still validates and hands the parsed body on', async () => {
    const { req } = await run({ password: 'x' }, z.object({ password: z.string() }));
    expect(req.body).toEqual({ password: 'x' });
  });
});
