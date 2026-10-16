// `hashedPassword` no longer lives in `providerData` (ADR 0011 slice 2) but stays listed:
// a copy of an old row must still never reach a client.
const SECRET_PROVIDER_DATA_KEYS = new Set([
  'hashedPassword',
  'otp',
  'passwordResetOtp',
  'password',
  'accessToken',
]);

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
