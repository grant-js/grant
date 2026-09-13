import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `413` and `400` where there used to be `500 INTERNAL_ERROR`.
 *
 * Phase B verified the old behaviour against a running container rather than inferring
 * it (`plans/2026-08-21-aws-lambda-runtime-measurements.md` § finding 4): an oversized
 * body and a malformed one both answered `500`. `body-parser` raises errors that are
 * neither `GrantException` nor `HttpException`, so both fell through to the generic
 * handler — the API told a caller who sent 11 MiB that the server had a bug.
 *
 * Every target gets this, not just Lambda. The 500 was wrong under Docker and Kubernetes
 * too; it is merely more consequential where the runtime has a hard cap of its own.
 */

const mockConfig = { app: { isDevelopment: false } };
vi.mock('@/config', () => ({ config: mockConfig }));

vi.mock('@/i18n', () => ({
  // Identity-ish: the tests assert which key was chosen, not how it reads in English.
  translateError: (_req: Request, error: { translationKey?: string; message: string }) =>
    error.translationKey ?? error.message,
  t: (_req: Request, key: string) => key,
}));

vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const { errorHandler } = await import('@/middleware/error.middleware');

interface Captured {
  status: number;
  body: Record<string, unknown>;
}

/** Runs the handler and returns what it wrote. */
function handle(error: Error): Captured {
  const captured = { status: 0, body: {} as Record<string, unknown> };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: Record<string, unknown>) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;

  errorHandler(
    error,
    { path: '/api/projects', method: 'POST' } as Request,
    res,
    vi.fn() as NextFunction
  );
  return captured;
}

/** The shape `body-parser` throws. `type` is its documented discriminator. */
function bodyParserError(type: string, extra: Record<string, unknown> = {}): Error {
  const error = new Error(`body-parser: ${type}`);
  return Object.assign(error, { type, ...extra });
}

describe('an oversized body', () => {
  beforeEach(() => {
    mockConfig.app.isDevelopment = false;
  });

  it('answers 413, not 500', () => {
    const result = handle(
      bodyParserError('entity.too.large', { limit: 5_242_880, length: 11_534_336 })
    );

    expect(result.status).toBe(413);
    expect(result.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('says what the limit was, in a field rather than only in prose', () => {
    // A client that has to regex an English sentence to learn the ceiling cannot act on
    // it in code — which is the whole difference between a 413 and a 500 here.
    const result = handle(
      bodyParserError('entity.too.large', { limit: 5_242_880, length: 11_534_336 })
    );

    expect(result.body.extensions).toEqual({ limitBytes: 5_242_880, receivedBytes: 11_534_336 });
    expect(result.body.translationKey).toBe('errors.common.payloadTooLarge');
  });

  it('omits the sizes body-parser did not report, rather than sending undefined', () => {
    // `length` is absent for a chunked request. An extension key whose value is
    // undefined serializes away, but `limitBytes: undefined` would read as zero to
    // anything consuming it defensively.
    const result = handle(bodyParserError('entity.too.large', { limit: 5_242_880 }));

    expect(result.body.extensions).toEqual({ limitBytes: 5_242_880 });
  });
});

describe('a malformed body', () => {
  it('answers 400, not 500', () => {
    const result = handle(bodyParserError('entity.parse.failed'));

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('BAD_REQUEST');
    expect(result.body.translationKey).toBe('errors.validation.badRequest');
  });

  it('says the body was not JSON, rather than repeating body-parser internals', () => {
    // `details` used to be attached only for a `GrantException`, which a body-parser
    // error is not. It carries the domain error's sentence now — not the parser's,
    // which names character offsets in a buffer the caller cannot see.
    const result = handle(bodyParserError('entity.parse.failed'));

    expect(result.body.details).toBe('Request body is not valid JSON');
  });
});

describe('everything else is untouched', () => {
  it('still answers 500 for an ordinary Error', () => {
    // The fallback has to stay a fallback. Widening it to catch every SyntaxError would
    // turn a genuine parse bug somewhere in the stack into a client error.
    const result = handle(new SyntaxError('Unexpected token in some unrelated library'));

    expect(result.status).toBe(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
  });

  it('does not classify by class name, so a foreign PayloadTooLargeError is still a 500', () => {
    // The discriminator is `err.type`. A same-named class from another dependency has
    // no `type` and must not be mistaken for body-parser's.
    class PayloadTooLargeError extends Error {}
    const result = handle(new PayloadTooLargeError('from somewhere else'));

    expect(result.status).toBe(500);
  });

  it('still maps a domain error through mapDomainToHttp', async () => {
    const { NotFoundError } = await import('@/lib/errors');
    const result = handle(new NotFoundError('Project', 'p-1'));

    expect(result.status).toBe(404);
    expect(result.body.code).toBe('NOT_FOUND');
  });
});
