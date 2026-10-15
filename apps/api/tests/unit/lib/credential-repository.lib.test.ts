import { ConflictError, GrantException } from '@grantjs/core';
import { describe, expect, it } from 'vitest';

import {
  toCredentialStorageError,
  withCredentialStorageErrors,
} from '@/repositories/credential-repository.lib';

const HASH = '$2b$10$' + 'x'.repeat(53);

/** What Drizzle throws: the parameters, hash included, are in the message. */
function drizzleQueryError(sqlState: string): Error {
  const cause = Object.assign(new Error('driver error'), { code: sqlState });
  const error = new Error(
    `Failed query: insert into "user_credentials" ("hash") values ($1)\nparams: ${HASH}`
  );
  (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

describe('toCredentialStorageError', () => {
  it('keeps the SQLSTATE and drops the query and its parameters', () => {
    const mapped = toCredentialStorageError(drizzleQueryError('23503'));
    expect(mapped).toBeInstanceOf(GrantException);
    expect(mapped.message).toBe('Credential storage failed (SQLSTATE 23503)');
    expect(mapped.message).not.toContain(HASH);
    expect(mapped.originalError).toBeUndefined();
  });

  it('maps a unique violation to a ConflictError', () => {
    const mapped = toCredentialStorageError(drizzleQueryError('23505'));
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.message).not.toContain(HASH);
  });

  it('has fixed text when no SQLSTATE can be found', () => {
    expect(toCredentialStorageError(new Error(`boom ${HASH}`)).message).toBe(
      'Credential storage failed'
    );
  });
});

describe('withCredentialStorageErrors', () => {
  it('passes a result through and rethrows a sanitised error', async () => {
    await expect(withCredentialStorageErrors(async () => 42)).resolves.toBe(42);
    const rejection = withCredentialStorageErrors(async () => {
      throw drizzleQueryError('23514');
    });
    await expect(rejection).rejects.toThrow('Credential storage failed (SQLSTATE 23514)');
  });
});
