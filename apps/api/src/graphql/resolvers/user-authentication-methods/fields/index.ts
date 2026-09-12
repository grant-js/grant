import { userAuthenticationMethodHasPasswordResolver as hasPassword } from './has-password.resolver';
import { userAuthenticationMethodProviderDataResolver as providerData } from './provider-data.resolver';

export const userAuthenticationMethodResolver = {
  hasPassword,
  providerData,
};
