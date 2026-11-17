import { describe, expect, it } from 'vitest';

import {
  isGoogleEmailAuthoritative,
  normalizeVerifiedContactEmail,
} from '@/lib/oauth-contact-email.lib';

describe('normalizeVerifiedContactEmail', () => {
  it('returns a normalized address when the IdP marked it verified', () => {
    expect(normalizeVerifiedContactEmail('  Ada@Example.COM ', true)).toBe('ada@example.com');
  });

  it('returns null when the address is missing or unverified', () => {
    expect(normalizeVerifiedContactEmail('ada@example.com', false)).toBeNull();
    expect(normalizeVerifiedContactEmail(null, true)).toBeNull();
    expect(normalizeVerifiedContactEmail('not-an-email', true)).toBeNull();
  });
});

describe('isGoogleEmailAuthoritative', () => {
  it('trusts a verified Gmail address', () => {
    expect(isGoogleEmailAuthoritative('Ada@Gmail.com', true, undefined)).toBe(true);
    expect(isGoogleEmailAuthoritative('ada@googlemail.com', true, null)).toBe(true);
  });

  it('trusts a verified address in the Workspace domain named by hd', () => {
    expect(isGoogleEmailAuthoritative('ada@example.com', true, 'Example.com')).toBe(true);
  });

  it('does not trust a verified outside address without a matching hd', () => {
    expect(isGoogleEmailAuthoritative('ada@example.com', true, undefined)).toBe(false);
    expect(isGoogleEmailAuthoritative('ada@example.com', true, 'other.example')).toBe(false);
    expect(isGoogleEmailAuthoritative('ada@sub.example.com', true, 'example.com')).toBe(false);
  });

  it('does not trust an unverified or missing address', () => {
    expect(isGoogleEmailAuthoritative('ada@gmail.com', false, undefined)).toBe(false);
    expect(isGoogleEmailAuthoritative(null, true, 'example.com')).toBe(false);
  });
});
