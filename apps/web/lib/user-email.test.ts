import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { getUserEmail } from './user-email';

const method = (provider: UserAuthenticationMethodProvider, providerId: string) =>
  ({ provider, providerId }) as never;

describe('getUserEmail', () => {
  it("returns the Email method's address", () => {
    expect(
      getUserEmail({
        authenticationMethods: [
          method(UserAuthenticationMethodProvider.Github, '12345'),
          method(UserAuthenticationMethodProvider.Email, 'ada@example.test'),
        ],
      })
    ).toBe('ada@example.test');
  });

  it('returns nothing for GitHub or Google only, no methods, or an empty address', () => {
    expect(
      getUserEmail({
        authenticationMethods: [method(UserAuthenticationMethodProvider.Google, 'g-1')],
      })
    ).toBeUndefined();
    expect(getUserEmail({ authenticationMethods: [] })).toBeUndefined();
    expect(getUserEmail({ authenticationMethods: undefined })).toBeUndefined();
    expect(
      getUserEmail({ authenticationMethods: [method(UserAuthenticationMethodProvider.Email, '')] })
    ).toBeUndefined();
  });
});
