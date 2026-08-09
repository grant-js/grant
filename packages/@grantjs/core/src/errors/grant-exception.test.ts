import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConfigurationError,
  ConflictError,
  GrantException,
  InvalidOrUsedVerificationTokenError,
  NoSessionSigningKeyError,
  NotFoundError,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
  ValidationError,
} from './grant-exception';

describe('GrantException', () => {
  it('sets message, code, name, and is an instance of Error', () => {
    const err = new GrantException('something broke', 'SOME_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GrantException);
    expect(err.message).toBe('something broke');
    expect(err.code).toBe('SOME_CODE');
    expect(err.name).toBe('GrantException');
    expect(err.originalError).toBeUndefined();
  });

  it('carries an optional originalError through unchanged', () => {
    const cause = new Error('root cause');
    const err = new GrantException('wrapped', 'WRAPPED', cause);
    expect(err.originalError).toBe(cause);
  });

  it('captures a stack trace', () => {
    const err = new GrantException('x', 'X');
    expect(typeof err.stack).toBe('string');
    expect(err.stack).toContain('GrantException');
  });
});

describe('NotFoundError', () => {
  it('includes the id in the message when id is a non-empty string', () => {
    const err = new NotFoundError('User', 'abc-123');
    expect(err.message).toBe("User 'abc-123' not found");
    expect(err.resource).toBe('User');
    expect(err.resourceId).toBe('abc-123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('NotFoundError');
  });

  it('omits the id from the message when id is undefined', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
    expect(err.resourceId).toBeUndefined();
  });

  it('includes an empty-string id in the message (distinct from no id)', () => {
    const err = new NotFoundError('User', '');
    expect(err.message).toBe("User '' not found");
    expect(err.resourceId).toBe('');
  });
});

describe('ValidationError', () => {
  it('defaults violations to an empty array', () => {
    const err = new ValidationError('invalid input');
    expect(err.violations).toEqual([]);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('ValidationError');
  });

  it('stores the violations array by reference, without a defensive copy', () => {
    const violations = ['field is required'];
    const err = new ValidationError('invalid input', violations);
    expect(err.violations).toBe(violations);
  });
});

describe('BadRequestError', () => {
  it('sets a BAD_REQUEST code', () => {
    const err = new BadRequestError('bad input');
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.name).toBe('BadRequestError');
  });
});

describe('InvalidOrUsedVerificationTokenError', () => {
  it('defaults to a fixed message and BAD_REQUEST code', () => {
    const err = new InvalidOrUsedVerificationTokenError();
    expect(err.message).toBe('Invalid or already used verification token');
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.name).toBe('InvalidOrUsedVerificationTokenError');
  });
});

describe('AuthenticationError', () => {
  it('defaults to "Authentication required" and UNAUTHENTICATED code', () => {
    const err = new AuthenticationError();
    expect(err.message).toBe('Authentication required');
    expect(err.code).toBe('UNAUTHENTICATED');
  });
});

describe('AuthorizationError', () => {
  it('defaults to "Forbidden" with no reason or metadata', () => {
    const err = new AuthorizationError();
    expect(err.message).toBe('Forbidden');
    expect(err.code).toBe('FORBIDDEN');
    expect(err.reason).toBeUndefined();
    expect(err.metadata).toBeUndefined();
  });

  it('carries reason, metadata, and originalError with originalError last', () => {
    const cause = new Error('root');
    const err = new AuthorizationError(
      'Nope',
      'missing_permission',
      {
        permission: 'x:read',
      },
      cause
    );
    expect(err.reason).toBe('missing_permission');
    expect(err.metadata).toEqual({ permission: 'x:read' });
    expect(err.originalError).toBe(cause);
  });
});

describe('ConflictError', () => {
  it('defaults resource and field to undefined', () => {
    const err = new ConflictError('duplicate');
    expect(err.resource).toBeUndefined();
    expect(err.field).toBeUndefined();
    expect(err.code).toBe('CONFLICT');
  });

  it('carries resource and field', () => {
    const err = new ConflictError('email taken', 'User', 'email');
    expect(err.resource).toBe('User');
    expect(err.field).toBe('email');
  });
});

describe('ConfigurationError', () => {
  it('sets a CONFIGURATION_ERROR code', () => {
    const err = new ConfigurationError('missing env var FOO');
    expect(err.code).toBe('CONFIGURATION_ERROR');
  });
});

describe('TokenExpiredError', () => {
  it('defaults message and leaves expiredAt undefined', () => {
    const err = new TokenExpiredError();
    expect(err.message).toBe('Token has expired');
    expect(err.code).toBe('TOKEN_EXPIRED');
    expect(err.expiredAt).toBeUndefined();
  });

  it('carries an explicit expiredAt', () => {
    const at = new Date('2024-01-01T00:00:00Z');
    const err = new TokenExpiredError('expired', at);
    expect(err.expiredAt).toBe(at);
  });
});

describe('TokenInvalidError', () => {
  it('defaults to "Invalid token" and TOKEN_INVALID code', () => {
    const err = new TokenInvalidError();
    expect(err.message).toBe('Invalid token');
    expect(err.code).toBe('TOKEN_INVALID');
  });
});

describe('TokenValidationError', () => {
  it('defaults to "Token validation failed" and TOKEN_VALIDATION_FAILED code', () => {
    const err = new TokenValidationError();
    expect(err.message).toBe('Token validation failed');
    expect(err.code).toBe('TOKEN_VALIDATION_FAILED');
  });
});

describe('NoSessionSigningKeyError', () => {
  it('defaults to "No session signing key found" and matching code', () => {
    const err = new NoSessionSigningKeyError();
    expect(err.message).toBe('No session signing key found');
    expect(err.code).toBe('NO_SESSION_SIGNING_KEY_FOUND');
  });
});

describe('every domain exception', () => {
  it('is an instanceof both Error and GrantException', () => {
    const instances: GrantException[] = [
      new NotFoundError('X'),
      new ValidationError('x'),
      new BadRequestError('x'),
      new InvalidOrUsedVerificationTokenError(),
      new AuthenticationError(),
      new AuthorizationError(),
      new ConflictError('x'),
      new ConfigurationError('x'),
      new TokenExpiredError(),
      new TokenInvalidError(),
      new TokenValidationError(),
      new NoSessionSigningKeyError(),
    ];
    for (const err of instances) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(GrantException);
    }
  });
});
