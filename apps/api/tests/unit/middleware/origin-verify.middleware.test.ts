import type { ISecretResolver } from '@grantjs/core';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { AuthorizationError } from '@/lib/errors';
import {
  ORIGIN_VERIFY_SECRET_KEY,
  originVerifyMiddleware,
} from '@/middleware/origin-verify.middleware';

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
    header = config.security.originVerifyHeader;
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

  it('is a pass-through when no secret is configured', async () => {
    // Docker and Kubernetes configure none, and must behave exactly as before.
    const err = await run(resolverWith(undefined), request());

    expect(err).toBeUndefined();
  });

  it('lets /health through without the header', async () => {
    // Load-bearing, not a convenience. The Lambda Web Adapter probes /health over
    // loopback to decide the container is ready, and that probe carries no CloudFront
    // headers. Refusing it means the function never reports ready and every
    // invocation fails.
    const err = await run(resolverWith(SECRET), request({}, '/health'));

    expect(err).toBeUndefined();
  });

  it('does not exempt paths that merely start with /health', async () => {
    // An exemption matched by prefix would hand an attacker `/health/../graphql`.
    const err = await run(resolverWith(SECRET), request({}, '/healthz'));

    expect(err).toBeInstanceOf(AuthorizationError);
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
