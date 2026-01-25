import {
  GrantException,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
} from '@grantjs/core';

import { AuthenticationError } from './error-classes';

export function mapGrantExceptionToApiError(error: unknown): Error {
  if (error instanceof TokenExpiredError) {
    return new AuthenticationError('Token has expired', 'errors.auth.token_expired', undefined, {
      expiredAt: error.expiredAt?.toISOString(),
    });
  }

  if (error instanceof TokenInvalidError || error instanceof TokenValidationError) {
    return new AuthenticationError(error.message || 'Invalid token', 'errors.auth.token_invalid');
  }

  if (error instanceof GrantException) {
    return new AuthenticationError(
      error.message || 'Authentication failed',
      'errors.auth.authentication_failed'
    );
  }

  return error as Error;
}
