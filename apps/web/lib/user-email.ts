import { UserAuthenticationMethodProvider } from '@grantjs/schema';

/** What {@link getUserEmail} reads: a user's authentication methods, as any query selects them. */
export interface UserEmailSource {
  authenticationMethods?: ReadonlyArray<{ provider: string; providerId: string }> | null;
}

/**
 * The address of the user's Email authentication method (a user holds at most one), or
 * `undefined`. GitHub and Google methods are not an email identity, so they never count.
 */
export function getUserEmail(user: UserEmailSource): string | undefined {
  return (
    (user.authenticationMethods ?? []).find(
      (method) => method.provider === UserAuthenticationMethodProvider.Email
    )?.providerId || undefined
  );
}
