/**
 * Base exception class for all Grant-related errors.
 * This class is domain-agnostic and does not include HTTP-specific concepts
 * like status codes, translation keys, or extension bags.
 *
 * Infrastructure adapters (HTTP, GraphQL) map these to transport-specific
 * error representations at the boundary.
 */
export class GrantException extends Error {
  public readonly code: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'GrantException';
    this.code = code;
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ---------------------------------------------------------------------------
// Domain exceptions
// ---------------------------------------------------------------------------

/**
 * Thrown when a requested entity cannot be found.
 */
export class NotFoundError extends GrantException {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(resource: string, id?: string, originalError?: Error) {
    super(
      id ? `${resource} '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      originalError
    );
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Thrown when input validation fails.
 */
export class ValidationError extends GrantException {
  public readonly violations: string[];

  constructor(message: string, violations: string[] = [], originalError?: Error) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
    this.violations = violations;
  }
}

/**
 * Thrown when a request is semantically invalid (bad input, invalid state, etc.).
 */
export class BadRequestError extends GrantException {
  constructor(message: string, originalError?: Error) {
    super(message, 'BAD_REQUEST', originalError);
    this.name = 'BadRequestError';
  }
}

/**
 * Thrown when authentication is required or credentials are invalid.
 */
export class AuthenticationError extends GrantException {
  constructor(message: string = 'Authentication required', originalError?: Error) {
    super(message, 'UNAUTHENTICATED', originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the authenticated user lacks permission.
 */
export class AuthorizationError extends GrantException {
  public readonly reason?: string;

  constructor(message: string = 'Forbidden', reason?: string, originalError?: Error) {
    super(message, 'FORBIDDEN', originalError);
    this.name = 'AuthorizationError';
    this.reason = reason;
  }
}

/**
 * Thrown when an operation conflicts with existing state (e.g. duplicate).
 */
export class ConflictError extends GrantException {
  public readonly resource?: string;
  public readonly field?: string;

  constructor(message: string, resource?: string, field?: string, originalError?: Error) {
    super(message, 'CONFLICT', originalError);
    this.name = 'ConflictError';
    this.resource = resource;
    this.field = field;
  }
}

/**
 * Thrown when the system is misconfigured (missing env vars, bad adapter config, etc.).
 */
export class ConfigurationError extends GrantException {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONFIGURATION_ERROR', originalError);
    this.name = 'ConfigurationError';
  }
}

// ---------------------------------------------------------------------------
// Token-specific exceptions (pre-existing)
// ---------------------------------------------------------------------------

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

/**
 * Thrown when no session signing key is found.
 */
export class NoSessionSigningKeyError extends GrantException {
  constructor(message: string = 'No session signing key found', originalError?: Error) {
    super(message, 'NO_SESSION_SIGNING_KEY_FOUND', originalError);
    this.name = 'NoSessionSigningKeyError';
  }
}
