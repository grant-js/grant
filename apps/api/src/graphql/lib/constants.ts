// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Token expiration settings
export const ACCESS_TOKEN_EXPIRATION_MINUTES =
  Number(process.env.ACCESS_TOKEN_EXPIRATION_MINUTES) || 15;
export const REFRESH_TOKEN_EXPIRATION_DAYS =
  Number(process.env.REFRESH_TOKEN_EXPIRATION_DAYS) || 30;

// Provider verification
export const PROVIDER_VERIFICATION_EXPIRATION_DAYS =
  Number(process.env.NEXT_PUBLIC_PROVIDER_VERIFICATION_EXPIRATION_DAYS) ?? 7;

// System constants
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
