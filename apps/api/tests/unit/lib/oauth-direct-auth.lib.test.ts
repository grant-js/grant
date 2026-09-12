import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { assertEmailProviderForDirectAuth } from '@/lib/oauth-direct-auth.lib';

describe('assertEmailProviderForDirectAuth', () => {
  it('allows email', () => {
    expect(() =>
      assertEmailProviderForDirectAuth(UserAuthenticationMethodProvider.Email)
    ).not.toThrow();
  });

  it('rejects Google and GitHub', () => {
    expect(() => assertEmailProviderForDirectAuth(UserAuthenticationMethodProvider.Google)).toThrow(
      'Use the OAuth authorize endpoint'
    );
    expect(() => assertEmailProviderForDirectAuth(UserAuthenticationMethodProvider.Github)).toThrow(
      'Use the OAuth authorize endpoint'
    );
  });
});
