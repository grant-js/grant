/**
 * Unit tests: mapDomainToHttp assigns correct translationKey (and translationParams)
 * for each domain exception type. Ensures the API's i18n contract is stable.
 */
import {
  NoSessionSigningKeyError,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
} from '@grantjs/core';
import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  InvalidOrUsedVerificationTokenError,
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

  describe('errors that carry a stable reason', () => {
    it.each([
      [
        new AuthorizationError('no', 'OWNERSHIP_TRANSFER_NOT_OWNER'),
        403,
        'errors.ownershipTransfer.notOwner',
      ],
      [
        new BadRequestError('no', undefined, 'OWNERSHIP_TRANSFER_SELF'),
        400,
        'errors.ownershipTransfer.self',
      ],
      [
        new NotFoundError('Member', 'u1', undefined, 'OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER'),
        404,
        'errors.ownershipTransfer.targetNotMember',
      ],
      [
        new ConflictError(
          'no',
          'Member',
          'newOwnerId',
          undefined,
          'OWNERSHIP_TRANSFER_TARGET_UNVERIFIED'
        ),
        409,
        'errors.ownershipTransfer.targetUnverified',
      ],
    ])('maps %o to its own key and returns the reason to the client', (error, status, key) => {
      const http = mapDomainToHttp(error);
      expect(http.statusCode).toBe(status);
      expect(http.translationKey).toBe(key);
      expect(http.extensions?.reason).toBe((error as { reason?: string }).reason);
    });

    it('keeps the generic key, and no reason, for the same classes without one', () => {
      expect(mapDomainToHttp(new BadRequestError('x')).extensions).toBeUndefined();
      expect(mapDomainToHttp(new NotFoundError('Member', 'u1')).extensions).toEqual({
        memberId: 'u1',
      });
      expect(mapDomainToHttp(new ConflictError('x')).translationKey).toBe(
        'errors.conflict.duplicateEntry'
      );
    });

    it('falls back to the generic key for a reason with no catalogue entry', () => {
      const http = mapDomainToHttp(new BadRequestError('x', undefined, 'SOME_OTHER_REASON'));
      expect(http.translationKey).toBe('errors.validation.badRequest');
      expect(http.extensions).toEqual({ reason: 'SOME_OTHER_REASON' });
    });
  });

  it('maps InvalidOrUsedVerificationTokenError to errors.auth.invalidOrUsedVerificationToken', () => {
    const err = new InvalidOrUsedVerificationTokenError(
      'Invalid or already used verification token'
    );
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.invalidOrUsedVerificationToken');
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

  it('maps PUBLIC_SIGNUP_DISABLED to errors.auth.publicSignupDisabled', () => {
    const err = new AuthorizationError('Public signup is disabled', 'PUBLIC_SIGNUP_DISABLED');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.publicSignupDisabled');
    expect(http.extensions).toEqual({ reason: 'PUBLIC_SIGNUP_DISABLED' });
  });

  it('maps LAST_HUMAN_USER to errors.auth.lastHumanUser', () => {
    const err = new AuthorizationError('Cannot delete the last human user', 'LAST_HUMAN_USER');
    const http = mapDomainToHttp(err);
    expect(http.translationKey).toBe('errors.auth.lastHumanUser');
    expect(http.extensions).toEqual({ reason: 'LAST_HUMAN_USER' });
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
