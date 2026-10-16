import { ConflictError, GrantException } from '@grantjs/core';

/**
 * Credential writes carry a bcrypt hash as a query parameter, and Drizzle puts every
 * parameter into the message of a failed query (`Failed query: ... params: ...`). A
 * message outlives the request: it reaches the error log and the error response. So a
 * write that carries a hash never lets the driver's error out; it becomes a fixed-text
 * error that keeps only the SQLSTATE.
 */

const MAX_CAUSE_DEPTH = 5;
const UNIQUE_VIOLATION = '23505';

function findSqlState(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

export function toCredentialStorageError(error: unknown): GrantException {
  const sqlState = findSqlState(error);
  if (sqlState === UNIQUE_VIOLATION) {
    return new ConflictError('Credential already exists', 'Credential');
  }
  return new GrantException(
    sqlState ? `Credential storage failed (SQLSTATE ${sqlState})` : 'Credential storage failed',
    'CREDENTIAL_STORAGE_ERROR'
  );
}

export async function withCredentialStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toCredentialStorageError(error);
  }
}
