/**
 * Unit tests: mapDomainToHttp assigns correct translationKey (and translationParams)
 * for each domain exception type. Ensures the API's i18n contract is stable.
 */
import {
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
  NoSessionSigningKeyError,
} from '@grantjs/core';
import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  mapDomainToHttp,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';

describe('mapDomainToHttp translationKey', () => {
  it('maps NotFoundError to errors.notFound.<segment> with optional translationParams', () => {
    const err = new NotFoundError('Organization', 'org-123');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.notFound.organization');
    expect(http.translationParams).toEqual({ organizationId: 'org-123' });
  });

  it('maps NotFoundError without resourceId to no translationParams', () => {
    const err = new NotFoundError('User');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.notFound.user');
    expect(http.translationParams).toBeUndefined();
  });

  it('maps ValidationError to errors.validation.invalid', () => {
    const err = new ValidationError('Invalid input', ['field1', 'field2']);
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.validation.invalid');
  });

  it('maps BadRequestError to errors.validation.badRequest', () => {
    const err = new BadRequestError('Malformed body');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.validation.badRequest');
  });

  it('maps TokenExpiredError to errors.auth.tokenExpired', () => {
    const err = new TokenExpiredError('Token expired');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.tokenExpired');
  });

  it('maps TokenInvalidError to errors.auth.tokenInvalid', () => {
    const err = new TokenInvalidError('Invalid token');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.tokenInvalid');
  });

  it('maps TokenValidationError to errors.auth.tokenInvalid', () => {
    const err = new TokenValidationError('Token validation failed');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.tokenInvalid');
  });

  it('maps NoSessionSigningKeyError to errors.auth.noSigningKey', () => {
    const err = new NoSessionSigningKeyError('No signing key');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.noSigningKey');
  });

  it('maps AuthenticationError to errors.auth.notAuthenticated', () => {
    const err = new AuthenticationError('Not authenticated');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.notAuthenticated');
  });

  it('maps AuthorizationError to errors.auth.forbidden', () => {
    const err = new AuthorizationError('Forbidden');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.forbidden');
  });

  it('maps ConflictError with resource to errors.conflict.<segment>', () => {
    const err = new ConflictError('Duplicate entry', 'ProjectTag');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.conflict.projectTag');
  });

  it('maps ConflictError without resource to errors.conflict.duplicateEntry', () => {
    const err = new ConflictError('Duplicate');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.conflict.duplicateEntry');
  });

  it('translationKey uses dot-only format (no colons)', () => {
    const err = new NotFoundError('API key', 'key-1');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.notFound.apiKey');
    expect(http.translationKey).not.toMatch(/:/);
  });
});
