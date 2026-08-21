import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GrantServerError,
  NotFoundError,
} from '../errors';

/**
 * Pass 7, slice 8. This hierarchy is semver-public — all five classes appear in the built
 * dist/index.d.ts — and had no tests.
 *
 * The behaviour worth pinning is `instanceof`. Each constructor calls
 * `Object.setPrototypeOf(this, X.prototype)` to work around the ES5-target subclassing
 * break; if a future build config drops those calls, or an `extends` chain is edited,
 * `instanceof` silently starts returning false and every consumer `catch` that
 * discriminates on it stops matching. Nothing else in the suite would notice.
 */

const cases = [
  {
    Klass: AuthenticationError,
    name: 'AuthenticationError',
    status: 401,
    code: 'UNAUTHENTICATED',
    message: 'Unauthorized',
  },
  {
    Klass: AuthorizationError,
    name: 'AuthorizationError',
    status: 403,
    code: 'FORBIDDEN',
    message: 'Forbidden',
  },
  {
    Klass: BadRequestError,
    name: 'BadRequestError',
    status: 400,
    code: 'BAD_REQUEST',
    message: 'Bad Request',
  },
  {
    Klass: NotFoundError,
    name: 'NotFoundError',
    status: 404,
    code: 'NOT_FOUND',
    message: 'Not Found',
  },
] as const;

describe('GrantServerError', () => {
  it('carries message, code and an explicit status', () => {
    const err = new GrantServerError('boom', 'CUSTOM', 418);
    expect(err.message).toBe('boom');
    expect(err.code).toBe('CUSTOM');
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe('GrantServerError');
  });

  it('defaults statusCode to 500', () => {
    expect(new GrantServerError('boom', 'CUSTOM').statusCode).toBe(500);
  });

  it('is a real Error', () => {
    const err = new GrantServerError('boom', 'CUSTOM');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GrantServerError);
    expect(err.stack).toBeDefined();
  });
});

describe.each(cases)('$name', ({ Klass, name, status, code, message }) => {
  it('applies its documented defaults', () => {
    const err = new Klass();
    expect(err.message).toBe(message);
    expect(err.code).toBe(code);
    expect(err.statusCode).toBe(status);
    expect(err.name).toBe(name);
  });

  it('accepts an overriding message and code', () => {
    const err = new Klass('custom message', 'CUSTOM_CODE');
    expect(err.message).toBe('custom message');
    expect(err.code).toBe('CUSTOM_CODE');
    // statusCode is fixed by the subclass and is not an override
    expect(err.statusCode).toBe(status);
  });

  it('satisfies instanceof for itself, its base, and Error', () => {
    const err = new Klass();
    expect(err).toBeInstanceOf(Klass);
    expect(err).toBeInstanceOf(GrantServerError);
    expect(err).toBeInstanceOf(Error);
  });

  it('is catchable and discriminable by instanceof', () => {
    // The reason the prototype fix-ups exist: consumers branch on these in catch blocks.
    let caught: unknown;
    try {
      throw new Klass();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Klass);
    expect((caught as GrantServerError).statusCode).toBe(status);
  });

  it('is not confused with its siblings', () => {
    const err = new Klass();
    for (const other of cases) {
      if (other.Klass === Klass) continue;
      expect(err).not.toBeInstanceOf(other.Klass);
    }
  });
});

describe('AuthorizationError.reason', () => {
  it('is undefined unless supplied', () => {
    expect(new AuthorizationError().reason).toBeUndefined();
  });

  it('carries the third constructor argument', () => {
    const err = new AuthorizationError('Forbidden', 'FORBIDDEN', 'NO_MATCHING_PERMISSION_FOUND');
    expect(err.reason).toBe('NO_MATCHING_PERMISSION_FOUND');
  });

  it('is the only subclass that captures a third argument', () => {
    // The signature is positional, so a call written for AuthorizationError and later
    // retargeted at a sibling would drop the third argument silently. Asserted on
    // behaviour rather than Function.length, which is 0 for all four: `length` counts
    // only the parameters before the first defaulted one.
    expect(new AuthorizationError('m', 'c', 'because').reason).toBe('because');
    for (const Klass of [AuthenticationError, BadRequestError, NotFoundError]) {
      const err = new (Klass as unknown as new (...a: unknown[]) => object)('m', 'c', 'because');
      expect((err as { reason?: unknown }).reason).toBeUndefined();
    }
  });
});
