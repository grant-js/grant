import { UserAuthenticationMethodProvider } from '@grantjs/schema';

const SECRET_PROVIDER_DATA_KEYS = new Set(['hashedPassword', 'otp', 'password', 'accessToken']);

export function authMethodHasPassword(method: {
  provider: string;
  providerData?: unknown;
}): boolean {
  if (method.provider !== UserAuthenticationMethodProvider.Email) {
    return false;
  }
  const providerData =
    method.providerData && typeof method.providerData === 'object'
      ? (method.providerData as Record<string, unknown>)
      : {};
  return typeof providerData.hashedPassword === 'string' && providerData.hashedPassword.length > 0;
}

export function redactAuthMethodProviderData(providerData: unknown): Record<string, unknown> {
  if (!providerData || typeof providerData !== 'object' || Array.isArray(providerData)) {
    return {};
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(providerData as Record<string, unknown>)) {
    if (!SECRET_PROVIDER_DATA_KEYS.has(key)) {
      redacted[key] = value;
    }
  }
  return redacted;
}
