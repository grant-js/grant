import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import { BadRequestError } from '@/lib/errors';

/**
 * Password login/register and "add email method" are email-only.
 * GitHub/Google identities must be proven via the OAuth authorize/callback flow.
 */
export function assertEmailProviderForDirectAuth(provider: UserAuthenticationMethodProvider): void {
  if (provider !== UserAuthenticationMethodProvider.Email) {
    throw new BadRequestError(
      'Use the OAuth authorize endpoint to sign in or register with this provider'
    );
  }
}
