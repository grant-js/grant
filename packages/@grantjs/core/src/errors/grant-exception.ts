/**
 * Base exception class for all Grant-related errors.
 * This class is domain-agnostic and does not include HTTP-specific concepts.
 */
export class GrantException extends Error {
  public readonly code: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'GrantException';
    this.code = code;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a JWT token has expired.
 */
export class TokenExpiredError extends GrantException {
  public readonly expiredAt?: Date;

  constructor(message: string = 'Token has expired', expiredAt?: Date, originalError?: Error) {
    super(message, 'TOKEN_EXPIRED', originalError);
    this.name = 'TokenExpiredError';
    this.expiredAt = expiredAt;
  }
}

/**
 * Thrown when a JWT token is invalid, malformed, or cannot be parsed.
 */
export class TokenInvalidError extends GrantException {
  constructor(message: string = 'Invalid token', originalError?: Error) {
    super(message, 'TOKEN_INVALID', originalError);
    this.name = 'TokenInvalidError';
  }
}

/**
 * Thrown when a token fails validation checks (e.g., missing required claims).
 */
export class TokenValidationError extends GrantException {
  constructor(message: string = 'Token validation failed', originalError?: Error) {
    super(message, 'TOKEN_VALIDATION_FAILED', originalError);
    this.name = 'TokenValidationError';
  }
}
