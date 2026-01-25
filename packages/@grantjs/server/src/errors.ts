/**
 * Base error class for Grant server errors
 */
export class GrantServerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'GrantServerError';
    Object.setPrototypeOf(this, GrantServerError.prototype);
  }
}

/**
 * Authentication error (401)
 * Thrown when user is not authenticated
 */
export class AuthenticationError extends GrantServerError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHENTICATED') {
    super(message, code, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (403)
 * Thrown when user is authenticated but lacks required permission
 */
export class AuthorizationError extends GrantServerError {
  constructor(
    message: string = 'Forbidden',
    code: string = 'FORBIDDEN',
    public readonly reason?: string
  ) {
    super(message, code, 403);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Bad request error (400)
 * Thrown when request is malformed or missing required data
 */
export class BadRequestError extends GrantServerError {
  constructor(message: string = 'Bad Request', code: string = 'BAD_REQUEST') {
    super(message, code, 400);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Not found error (404)
 * Thrown when resource is not found
 */
export class NotFoundError extends GrantServerError {
  constructor(message: string = 'Not Found', code: string = 'NOT_FOUND') {
    super(message, code, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
