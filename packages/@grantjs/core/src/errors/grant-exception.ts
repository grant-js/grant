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
    this.name = new.target.name;
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
      id !== undefined ? `${resource} '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      originalError
    );
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
    this.violations = violations;
  }
}

/**
 * Thrown when a request is semantically invalid (bad input, invalid state, etc.).
 */
export class BadRequestError extends GrantException {
  constructor(message: string, originalError?: Error) {
    super(message, 'BAD_REQUEST', originalError);
  }
}

/**
 * Thrown when an email verification token is invalid or was already used.
 * Used so the API can return a specific translation key for the verify-email flow.
 */
export class InvalidOrUsedVerificationTokenError extends GrantException {
  constructor(
    message: string = 'Invalid or already used verification token',
    originalError?: Error
  ) {
    super(message, 'BAD_REQUEST', originalError);
  }
}

/**
 * Thrown when authentication is required or credentials are invalid.
 */
export class AuthenticationError extends GrantException {
  constructor(message: string = 'Authentication required', originalError?: Error) {
    super(message, 'UNAUTHENTICATED', originalError);
  }
}

/**
 * Thrown when the authenticated user lacks permission.
 */
export class AuthorizationError extends GrantException {
  public readonly reason?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string = 'Forbidden',
    reason?: string,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message, 'FORBIDDEN', originalError);
    this.reason = reason;
    this.metadata = metadata;
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
    this.expiredAt = expiredAt;
  }
}

/**
 * Thrown when a JWT token is invalid, malformed, or cannot be parsed.
 */
export class TokenInvalidError extends GrantException {
  constructor(message: string = 'Invalid token', originalError?: Error) {
    super(message, 'TOKEN_INVALID', originalError);
  }
}

/**
 * Thrown when a token fails validation checks (e.g., missing required claims).
 */
export class TokenValidationError extends GrantException {
  constructor(message: string = 'Token validation failed', originalError?: Error) {
    super(message, 'TOKEN_VALIDATION_FAILED', originalError);
  }
}

/**
 * Thrown when no session signing key is found.
 */
export class NoSessionSigningKeyError extends GrantException {
  constructor(message: string = 'No session signing key found', originalError?: Error) {
    super(message, 'NO_SESSION_SIGNING_KEY_FOUND', originalError);
  }
}
