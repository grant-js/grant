/**
 * Maps domain exceptions (from @grantjs/core) to HTTP exceptions.
 *
 * This is the single boundary where domain semantics are translated into
 * transport concerns (HTTP status codes, i18n translation keys, etc.).
 *
 * Translation key convention (dot-only, no colon):
 *   NotFoundError { resource: 'User' }        → 'errors.notFound.user'
 *   ConflictError { resource: 'ProjectTag' }   → 'errors.conflict.projectTag'
 *   AuthenticationError                        → 'errors.auth.notAuthenticated'
 *   AuthorizationError                         → 'errors.auth.forbidden'
 *   ValidationError                            → 'errors.validation.invalid'
 *   BadRequestError                            → 'errors.validation.badRequest'
 *   ConfigurationError                         → 'errors.common.internalError'
 */
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConfigurationError,
  ConflictError,
  GrantException,
  NotFoundError,
  NoSessionSigningKeyError,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
  ValidationError,
} from '@grantjs/core';

import {
  HttpBadRequestError,
  HttpConflictError,
  HttpException,
  HttpForbiddenError,
  HttpInternalError,
  HttpNotFoundError,
  HttpUnauthorizedError,
  HttpValidationError,
} from './http-exception';

/**
 * Convert a resource name to a camelCase translation key segment.
 * "User" → "user", "ProjectTag" → "projectTag", "API key" → "apiKey"
 */
function toTranslationSegment(resource: string): string {
  // Handle multi-word with spaces (e.g. "API key")
  const words = resource.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/);
  return words
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Map a domain GrantException to an HTTP-aware HttpException.
 *
 * Call this at the API boundary (REST middleware, GraphQL formatter) to
 * produce transport-ready error responses.
 */
export function mapDomainToHttp(error: GrantException): HttpException {
  // Not found
  if (error instanceof NotFoundError) {
    const segment = toTranslationSegment(error.resource);
    return new HttpNotFoundError(error.message, {
      translationKey: `errors.notFound.${segment}`,
      translationParams: error.resourceId ? { [`${segment}Id`]: error.resourceId } : undefined,
      extensions: error.resourceId ? { [`${segment}Id`]: error.resourceId } : undefined,
    });
  }

  // Validation
  if (error instanceof ValidationError) {
    return new HttpValidationError(error.message, error.violations, {
      translationKey: 'errors.validation.invalid',
    });
  }

  // Bad request
  if (error instanceof BadRequestError) {
    return new HttpBadRequestError(error.message, {
      translationKey: 'errors.validation.badRequest',
    });
  }

  // Authentication — includes token errors
  if (error instanceof TokenExpiredError) {
    return new HttpUnauthorizedError(error.message, {
      translationKey: 'errors.auth.tokenExpired',
      extensions: error.expiredAt ? { expiredAt: error.expiredAt.toISOString() } : undefined,
    });
  }

  if (error instanceof TokenInvalidError || error instanceof TokenValidationError) {
    return new HttpUnauthorizedError(error.message, {
      translationKey: 'errors.auth.tokenInvalid',
    });
  }

  if (error instanceof NoSessionSigningKeyError) {
    return new HttpUnauthorizedError(error.message, {
      translationKey: 'errors.auth.noSigningKey',
    });
  }

  if (error instanceof AuthenticationError) {
    return new HttpUnauthorizedError(error.message, {
      translationKey: 'errors.auth.notAuthenticated',
    });
  }

  // Authorization
  if (error instanceof AuthorizationError) {
    return new HttpForbiddenError(error.message, {
      translationKey: 'errors.auth.forbidden',
      extensions: error.reason ? { reason: error.reason } : undefined,
    });
  }

  // Conflict
  if (error instanceof ConflictError) {
    const extensions: Record<string, unknown> = {};
    if (error.resource) extensions.resource = error.resource;
    if (error.field) extensions.field = error.field;

    return new HttpConflictError(error.message, {
      translationKey: error.resource
        ? `errors.conflict.${toTranslationSegment(error.resource)}`
        : 'errors.conflict.duplicateEntry',
      extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
    });
  }

  // Configuration
  if (error instanceof ConfigurationError) {
    return new HttpInternalError(error.message, {
      translationKey: 'errors.common.internalError',
    });
  }

  // Fallback for any other GrantException
  return new HttpInternalError(error.message, {
    translationKey: 'errors.common.internalError',
    extensions: { code: error.code },
  });
}
