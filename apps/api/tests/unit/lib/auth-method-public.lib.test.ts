import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { authMethodHasPassword, redactAuthMethodProviderData } from '@/lib/auth-method-public.lib';

describe('authMethodHasPassword', () => {
  it('is true only for Email methods with a hashed password', () => {
    expect(
      authMethodHasPassword({
        provider: UserAuthenticationMethodProvider.Email,
        providerData: { hashedPassword: 'hash' },
      })
    ).toBe(true);
    expect(
      authMethodHasPassword({
        provider: UserAuthenticationMethodProvider.Email,
        providerData: {},
      })
    ).toBe(false);
    expect(
      authMethodHasPassword({
        provider: UserAuthenticationMethodProvider.Google,
        providerData: { hashedPassword: 'hash' },
      })
    ).toBe(false);
  });
});

describe('redactAuthMethodProviderData', () => {
  it('strips secrets from provider data', () => {
    expect(
      redactAuthMethodProviderData({
        hashedPassword: 'hash',
        otp: { token: '123' },
        password: 'secret',
        accessToken: 'tok',
        email: 'ada@example.com',
      })
    ).toEqual({ email: 'ada@example.com' });
  });
});
