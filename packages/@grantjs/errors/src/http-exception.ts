/**
 * HTTP-aware exception hierarchy.
 *
 * These are transport-layer errors that carry HTTP status codes, i18n
 * translation keys, and extension metadata for API responses.
 * Domain code never throws these — they are produced by `mapDomainToHttp()`
 * from domain `GrantException` subclasses at the API boundary.
 */

export interface HttpExceptionOptions {
  translationKey?: string;
  translationParams?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly translationKey?: string;
  public readonly translationParams?: Record<string, unknown>;
  public readonly extensions?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    options: HttpExceptionOptions = {}
  ) {
    super(message);
    this.name = 'HttpException';
    this.statusCode = statusCode;
    this.code = code;
    this.translationKey = options.translationKey;
    this.translationParams = options.translationParams;
    this.extensions = options.extensions;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class HttpBadRequestError extends HttpException {
  constructor(message: string, options: HttpExceptionOptions = {}) {
    super(message, 400, 'BAD_REQUEST', options);
    this.name = 'HttpBadRequestError';
  }
}

export class HttpValidationError extends HttpException {
  public readonly violations: string[];

  constructor(message: string, violations: string[] = [], options: HttpExceptionOptions = {}) {
    super(message, 400, 'BAD_USER_INPUT', {
      ...options,
      extensions: {
        ...options.extensions,
        validationErrors: violations,
      },
    });
    this.name = 'HttpValidationError';
    this.violations = violations;
  }
}

export class HttpUnauthorizedError extends HttpException {
  constructor(message: string, options: HttpExceptionOptions = {}) {
    super(message, 401, 'UNAUTHENTICATED', options);
    this.name = 'HttpUnauthorizedError';
  }
}

export class HttpForbiddenError extends HttpException {
  constructor(message: string, options: HttpExceptionOptions = {}) {
    super(message, 403, 'FORBIDDEN', options);
    this.name = 'HttpForbiddenError';
  }
}

export class HttpNotFoundError extends HttpException {
  constructor(message: string, options: HttpExceptionOptions = {}) {
    super(message, 404, 'NOT_FOUND', options);
    this.name = 'HttpNotFoundError';
  }
}

export class HttpConflictError extends HttpException {
  constructor(message: string, options: HttpExceptionOptions = {}) {
    super(message, 409, 'CONFLICT', options);
    this.name = 'HttpConflictError';
  }
}

export class HttpInternalError extends HttpException {
  constructor(message: string, options: HttpExceptionOptions = {}) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', options);
    this.name = 'HttpInternalError';
  }
}
