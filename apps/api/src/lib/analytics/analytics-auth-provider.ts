import type { AnalyticsAuthProvider } from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';

const ANALYTICS_AUTH_PROVIDER: Record<UserAuthenticationMethodProvider, AnalyticsAuthProvider> = {
  [UserAuthenticationMethodProvider.Email]: 'email',
  [UserAuthenticationMethodProvider.Github]: 'github',
  [UserAuthenticationMethodProvider.Google]: 'google',
};

export function analyticsAuthProvider(
  provider: UserAuthenticationMethodProvider
): AnalyticsAuthProvider {
  return ANALYTICS_AUTH_PROVIDER[provider];
}
