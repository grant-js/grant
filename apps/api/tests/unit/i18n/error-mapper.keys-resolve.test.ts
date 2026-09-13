import { SUPPORTED_LOCALES } from '@grantjs/i18n';
import { getMergedMessages } from '@grantjs/i18n/loader';
import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConfigurationError,
  ConflictError,
  type GrantException,
  InvalidOrUsedVerificationTokenError,
  mapDomainToHttp,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from '@/lib/errors';

/**
 * Every *static* translation key `mapDomainToHttp` can produce must exist in every
 * locale.
 *
 * `error-mapper.translationKey.test.ts` asserts which key each domain error is given.
 * Nothing asserted the key was ever defined, and the gap was not hypothetical — i18next
 * returns the key when it cannot resolve one, so three of them shipped as user-facing
 * text:
 *
 *   - `errors.validation.badRequest` — every `BadRequestError`, in both locales
 *   - `errors.auth.notAuthenticated` — every `AuthenticationError`, i.e. every 401
 *   - `errors.conflict.<resource>` — every `ConflictError` naming a resource
 *
 * The API answered real requests with a dot-separated identifier in the `error` field
 * and nothing failed anywhere. Found while adding `errors.common.payloadTooLarge` for
 * the 413 this slice is actually about.
 *
 * The first two are now defined and pinned below. The third is a different shape and is
 * covered by the second describe block.
 */

/** Domain errors whose translation key is fixed, not derived from a runtime value. */
const STATIC_KEY_ERRORS: GrantException[] = [
  new ValidationError('Invalid input', ['field']),
  new BadRequestError('Malformed body'),
  new InvalidOrUsedVerificationTokenError(),
  new AuthenticationError(),
  new AuthorizationError(),
  new PayloadTooLargeError('Request body is too large', 5_242_880, 11_534_336),
  new ConfigurationError('Missing env var'),
  new NotFoundError('User'),
];

/** `a.b.c` against the nested catalogue — how i18next resolves with `keySeparator: '.'`. */
function resolve(messages: Record<string, unknown>, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined,
      messages
    );
}

describe.each(SUPPORTED_LOCALES)('locale %s', (locale) => {
  const messages = getMergedMessages(locale) as Record<string, unknown>;

  it.each(STATIC_KEY_ERRORS.map((error) => [error.constructor.name, error] as const))(
    'defines the translationKey %s is mapped to',
    (_name, error) => {
      const key = mapDomainToHttp(error).translationKey;
      expect(key, 'the mapper produced no translationKey').toBeDefined();

      const message = resolve(messages, key as string);
      expect(
        message,
        `${key} is missing from the ${locale} catalogue — i18next would return the key itself`
      ).toBeTypeOf('string');
      expect(message).not.toBe('');
    }
  );

  it("defines the fallback arm's key, which nothing routine reaches", () => {
    expect(resolve(messages, 'errors.common.internalError')).toBeTypeOf('string');
  });
});

describe('resource-derived keys, which no catalogue can enumerate', () => {
  /**
   * `mapDomainToHttp` builds `errors.notFound.<segment>` and `errors.conflict.<segment>`
   * from a runtime resource name, so the key set grows with the domain and a catalogue
   * test can only ever check the entries someone remembered to add. That is why the
   * safety net lives in `translateError` instead: an unresolvable key falls back to the
   * error's own message, so the worst case is an untranslated sentence rather than a
   * leaked identifier.
   */

  it('produces a conflict key that is defined for no resource at all', () => {
    // Recorded, not fixed. `conflict` has only `duplicateEntry` and
    // `duplicateAuthMethod`, neither of which any derived key can equal, so *every*
    // ConflictError naming a resource misses. Closing it means deciding whether the
    // mapper should keep deriving keys it cannot guarantee — a decision this slice has
    // no business taking on the way past. See the stack plan's follow-ons.
    const key = mapDomainToHttp(
      new ConflictError('Duplicate', 'Organization', 'slug')
    ).translationKey;
    expect(key).toBe('errors.conflict.organization');

    for (const locale of SUPPORTED_LOCALES) {
      const messages = getMergedMessages(locale) as Record<string, unknown>;
      expect(resolve(messages, key as string)).toBeUndefined();
    }
  });

  it('falls back to duplicateEntry when the conflict names no resource', () => {
    const key = mapDomainToHttp(new ConflictError('Duplicate')).translationKey;
    expect(key).toBe('errors.conflict.duplicateEntry');

    for (const locale of SUPPORTED_LOCALES) {
      const messages = getMergedMessages(locale) as Record<string, unknown>;
      expect(resolve(messages, key as string)).toBeTypeOf('string');
    }
  });
});
