import { describe, expect, it } from 'vitest';

import { normalizeVerifiedContactEmail } from '@/lib/oauth-contact-email.lib';

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
