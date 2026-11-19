import { type User, UserAuthenticationMethodProvider } from '@grantjs/schema';

/**
 * The address of the user's Email authentication method (a user holds at most one), or
 * `undefined`. GitHub and Google methods are not an email identity, so they never count.
 */
export function getUserEmail(user: Pick<User, 'authenticationMethods'>): string | undefined {
  return (
    (user.authenticationMethods ?? []).find(
      (method) => method.provider === UserAuthenticationMethodProvider.Email
    )?.providerId || undefined
  );
}
