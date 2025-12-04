export interface ErrorOptions {
  statusCode?: number;
  code?: string;
  extensions?: Record<string, any>;
  translationKey?: string;
  translationParams?: Record<string, any>;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly extensions?: Record<string, any>;
  public readonly translationKey?: string;
  public readonly translationParams?: Record<string, any>;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_SERVER_ERROR';
    this.extensions = options.extensions;
    this.translationKey = options.translationKey;
    this.translationParams = options.translationParams;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class NotFoundError extends ApiError {
  constructor(
    message: string,
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      translationKey,
      translationParams,
      extensions,
    });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public readonly errors: any[] = [],
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 400,
      code: 'BAD_USER_INPUT',
      translationKey,
      translationParams,
      extensions: {
        ...extensions,
        validationErrors: errors,
      },
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(
    message: string,
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      translationKey,
      translationParams,
      extensions,
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(
    message: string,
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
      translationKey,
      translationParams,
      extensions,
    });
    this.name = 'AuthorizationError';
  }
}

export class ConflictError extends ApiError {
  constructor(
    message: string,
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT',
      translationKey,
      translationParams,
      extensions,
    });
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends ApiError {
  constructor(
    message: string,
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 400,
      code: 'BAD_REQUEST',
      translationKey,
      translationParams,
      extensions,
    });
    this.name = 'BadRequestError';
  }
}

export class ConfigurationError extends ApiError {
  constructor(
    message: string,
    translationKey?: string,
    translationParams?: Record<string, any>,
    extensions?: Record<string, any>
  ) {
    super(message, {
      statusCode: 500,
      code: 'CONFIGURATION_ERROR',
      translationKey,
      translationParams,
      extensions,
    });
    this.name = 'ConfigurationError';
  }
}
