import { describe, expect, it } from 'vitest';

import { redactAuthMethodProviderData } from '@/lib/auth-method-public.lib';

describe('redactAuthMethodProviderData', () => {
  it('strips secrets from provider data', () => {
    expect(
      redactAuthMethodProviderData({
        hashedPassword: 'hash',
        otp: { token: '123' },
        passwordResetOtp: { tokenHash: 'digest', validUntil: 1 },
        password: 'secret',
        accessToken: 'tok',
        email: 'ada@example.com',
      })
    ).toEqual({ email: 'ada@example.com' });
  });
});
