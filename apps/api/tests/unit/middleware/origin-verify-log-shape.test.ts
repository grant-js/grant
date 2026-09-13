import type { ISecretResolver } from '@grantjs/core';
import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The bytes the CloudWatch metric filter greps for.
 *
 * `deploy/aws/lib/observability/origin-verify-alarm.ts` puts a metric filter on this
 * function's log group matching two terms — `"module":"OriginVerify"` and
 * `"level":"warn"` — and an alarm on the resulting metric. That alarm is the named
 * compensating control for the publicly reachable Function URL, accepted as a risk on
 * phase C's record.
 *
 * The coupling is real and cannot be removed: something has to identify the refusal in
 * a log stream. What can be removed is its *invisibility*. Renaming the logger, or
 * demoting the refusal to `info`, disables the control silently — the filter keeps
 * matching nothing and the alarm keeps reporting healthy. This asserts the coupling
 * from the side that moves, so the change that would break it fails here first.
 *
 * Deliberately not asserting `msg`. The filter does not read it, precisely so that
 * improving the sentence is not a security regression.
 */

const BASE_ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
  LOG_PRETTY_PRINT: 'false',
  CACHE_STRATEGY: 'memory',
  EMAIL_PROVIDER: 'console',
  STORAGE_PROVIDER: 'local',
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
};

/**
 * Runs the middleware under a captured stdout and returns every line written.
 *
 * The logger module is imported *inside* the capture, and that ordering is load-bearing:
 * `@/lib/logger` configures pino at import time, and pino binds its destination when it
 * is constructed. A spy installed afterwards sees nothing — which looks exactly like a
 * passing test that asserts an absence.
 */
async function captureRefusal(
  headers: Record<string, string> = {},
  path = '/graphql'
): Promise<string[]> {
  const lines: string[] = [];
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      lines.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    });

  try {
    const { originVerifyMiddleware } = await import('@/middleware/origin-verify.middleware');
    const resolver: ISecretResolver = { resolve: vi.fn().mockResolvedValue(SECRET) };
    const request = { headers, path } as unknown as Request;

    await new Promise<void>((resolve) => {
      const next: NextFunction = () => resolve();
      originVerifyMiddleware(resolver)(request, {} as Response, next);
    });
  } finally {
    spy.mockRestore();
  }

  return lines.join('').split('\n').filter(Boolean);
}

const SECRET = 'the-origin-verify-secret';

describe('the origin-verify refusal log, as the alarm reads it', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const [key, value] of Object.entries(BASE_ENV)) {
      vi.stubEnv(key, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('emits both terms the metric filter matches', async () => {
    // The real logger, not a stub: what this asserts is the serialized JSON, because
    // that is what a CloudWatch text pattern sees. `createLogger(name)` binds
    // `module`, and pino's level formatter writes the label rather than a number —
    // both in `@grantjs/logger`, neither visible from the middleware alone.
    const lines = await captureRefusal();

    const refusal = lines.find((line) => line.includes('OriginVerify'));
    expect(refusal, 'no line naming the OriginVerify module was written').toBeDefined();

    // The two terms verbatim, in the form the filter carries them.
    expect(refusal).toContain('"module":"OriginVerify"');
    expect(refusal).toContain('"level":"warn"');
  });

  it('writes no such line when the request is admitted', async () => {
    // Otherwise the metric counts legitimate CDN traffic and the alarm fires on
    // success — the other way a threshold-based control becomes useless. Paired with
    // the case above, which proves the capture works at all; on its own an absence
    // assertion passes for any reason, including a broken harness.
    const { config } = await import('@/config');
    const lines = await captureRefusal({ [config.security.originVerifyHeader]: SECRET });

    expect(lines.filter((line) => line.includes('"module":"OriginVerify"'))).toEqual([]);
  });
});
