import type { ISecretResolver } from '@grantjs/core';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';

/**
 * Mocked rather than mutated: the real `config` is readonly, so assigning to it
 * type-checks as an error even though vitest would happily transpile past it.
 */
const mockConfig = {
  security: { originVerifyHeader: 'x-origin-verify', originVerifyRequired: false },
};
vi.mock('@/config', () => ({ config: mockConfig }));

// The middleware logs refusals. The logger builds itself from the real config at
// import time, which the mock above does not satisfy — and none of these tests assert
// on log output, so a stub is the whole requirement.
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const { ORIGIN_VERIFY_SECRET_KEY, originVerifyMiddleware } =
  await import('@/middleware/origin-verify.middleware');

const SECRET = 'a-shared-secret-value';

function resolverWith(secret: string | undefined): ISecretResolver {
  return { resolve: vi.fn().mockResolvedValue(secret) };
}

function request(headers: Record<string, string | string[]> = {}, path = '/graphql'): Request {
  return { headers, path } as unknown as Request;
}

/** Runs the middleware and resolves with whatever it passed to `next`. */
async function run(resolver: ISecretResolver, req: Request): Promise<unknown> {
  return new Promise((resolve) => {
    const next: NextFunction = (err?: unknown) => resolve(err);
    originVerifyMiddleware(resolver)(req, {} as Response, next);
  });
}

describe('originVerifyMiddleware', () => {
  let header: string;

  beforeEach(() => {
    header = mockConfig.security.originVerifyHeader;
    mockConfig.security.originVerifyRequired = false;
  });

  it('refuses a request that carries no secret', async () => {
    // The whole point: the Function URL is reachable, so a direct caller must be
    // turned away by something. Without this the URL is an unauthenticated origin.
    const err = await run(resolverWith(SECRET), request());

    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('refuses a request carrying the wrong secret', async () => {
    const err = await run(resolverWith(SECRET), request({ [header]: 'not-the-secret' }));

    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('admits a request carrying the right secret', async () => {
    const err = await run(resolverWith(SECRET), request({ [header]: SECRET }));

    expect(err).toBeUndefined();
  });

  it('is a pass-through when no secret is configured and none is required', async () => {
    // Docker and Kubernetes configure none, and must behave exactly as before.
    mockConfig.security.originVerifyRequired = false;
    const err = await run(resolverWith(undefined), request());

    expect(err).toBeUndefined();
  });

  it('fails closed when a secret is required but none resolves', async () => {
    // The control that replaces IAM must not be disableable by absence. A secret
    // dropped from the payload would otherwise open a publicly reachable origin
    // silently — no error, no failing test, nothing to notice.
    mockConfig.security.originVerifyRequired = true;
    const err = await run(resolverWith(undefined), request());

    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('exempts nothing, including /health', async () => {
    // /health used to be exempt so the Lambda Web Adapter could probe it, which left
    // an unauthenticated endpoint on a publicly reachable origin. The adapter now uses
    // a TCP readiness check, so there is no probe to accommodate and no exemption.
    const err = await run(resolverWith(SECRET), request({}, '/health'));

    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('admits /health when the secret is present, like any other path', async () => {
    const header = mockConfig.security.originVerifyHeader;
    const err = await run(resolverWith(SECRET), request({ [header]: SECRET }, '/health'));

    expect(err).toBeUndefined();
  });

  it('resolves the secret per request, so a rotation takes effect', async () => {
    // Captured at boot instead, a rotated secret would lock out the CDN until the
    // next redeploy — the failing ADR 0004 exists to avoid.
    const resolver = resolverWith(SECRET);
    await run(resolver, request({ [header]: SECRET }));
    await run(resolver, request({ [header]: SECRET }));

    expect(resolver.resolve).toHaveBeenCalledTimes(2);
    expect(resolver.resolve).toHaveBeenCalledWith(ORIGIN_VERIFY_SECRET_KEY);
  });

  it('surfaces a resolver failure rather than admitting the request', async () => {
    // Failing open here would turn a Secrets Manager outage into an open origin.
    const resolver: ISecretResolver = {
      resolve: vi.fn().mockRejectedValue(new Error('AccessDeniedException')),
    };

    const err = await run(resolver, request({ [header]: SECRET }));

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('AccessDeniedException');
  });
});
