import {
  AuthenticationError,
  GrantException,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
} from '@grantjs/core';

/**
 * Maps Grant core exceptions to domain-appropriate error types.
 * Token errors are mapped to AuthenticationError.
 * Returns the original error if it's not a GrantException.
 */
export function mapGrantExceptionToApiError(error: unknown): Error {
  if (error instanceof TokenExpiredError) {
    return new AuthenticationError('Token has expired');
  }

  if (error instanceof TokenInvalidError || error instanceof TokenValidationError) {
    return new AuthenticationError(error.message || 'Invalid token');
  }

  if (error instanceof GrantException) {
    return new AuthenticationError(error.message || 'Authentication failed');
  }

  return error as Error;
}
