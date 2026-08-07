import * as core from '@grantjs/core';
import { describe, expect, it } from 'vitest';

import * as libErrors from '@/lib/errors';

/**
 * AGENTS.md requires domain errors to be imported from `@/lib/errors`, never from
 * `@grantjs/core` directly. That rule was unfollowable for these four: they had no
 * re-export, so `api-keys.service.ts` had to reach into core. Keep them exported.
 */
const REQUIRED_DOMAIN_ERRORS = [
  'AuthenticationError',
  'AuthorizationError',
  'BadRequestError',
  'ConfigurationError',
  'ConflictError',
  'GrantException',
  'InvalidOrUsedVerificationTokenError',
  'NoSessionSigningKeyError',
  'NotFoundError',
  'TokenExpiredError',
  'TokenInvalidError',
  'TokenValidationError',
  'ValidationError',
] as const;

describe('@/lib/errors domain error re-exports', () => {
  it.each(REQUIRED_DOMAIN_ERRORS)('re-exports %s', (name) => {
    expect(libErrors[name as keyof typeof libErrors]).toBeDefined();
  });

  it.each(REQUIRED_DOMAIN_ERRORS)('re-exports the same %s class as core', (name) => {
    expect(libErrors[name as keyof typeof libErrors]).toBe(core[name as keyof typeof core]);
  });

  it('re-exports every GrantException subclass core exposes', () => {
    const coreErrorNames = Object.keys(core).filter((key) => {
      const value = core[key as keyof typeof core];
      return (
        typeof value === 'function' &&
        (value.prototype instanceof core.GrantException || value === core.GrantException)
      );
    });

    const missing = coreErrorNames.filter((name) => !(name in libErrors));
    expect(missing).toEqual([]);
  });
});
