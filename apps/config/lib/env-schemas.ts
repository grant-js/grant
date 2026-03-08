/**
 * Zod schemas for validating env variable values.
 * Used in the config UI and optionally in the API before persisting.
 */

import { z } from 'zod';

/** Non-empty string (trimmed); empty string allowed for optional vars */
const optionalString = z.string().transform((s) => s.trim());
/** URL (http or https) */
const urlSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\/[^\s]+$/.test(v), 'Must be a valid http(s) URL');

/** Positive integer port (1–65535) */
const portSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535), {
    message: 'Must be a port number (1–65535)',
  });

/** Node env */
const nodeEnvSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || ['development', 'production', 'test'].includes(v), {
    message: 'Must be development, production, or test',
  });

/** Log level */
const logLevelSchema = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === '' ||
      ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(v.toLowerCase()),
    { message: 'Must be trace, debug, info, warn, error, or fatal' }
  );

/** Cache strategy */
const cacheStrategySchema = z
  .string()
  .trim()
  .refine((v) => v === '' || ['memory', 'redis'].includes(v.toLowerCase()), {
    message: 'Must be memory or redis',
  });

/** Boolean env (true/false string) */
const booleanSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || v === 'true' || v === 'false', {
    message: 'Must be true or false',
  });

/** Non-negative integer (for rate limit numbers, window minutes, etc.) */
const positiveIntSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 0), {
    message: 'Must be a non-negative number',
  });

/** UUID v4 (for SYSTEM_USER_ID) */
const uuidSchema = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === '' ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
    { message: 'Must be a valid UUID' }
  );

/** PostgreSQL connection string (empty allowed for optional use) */
const dbUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^postgres(?:ql)?:\/\/[^\s]+$/.test(v),
    { message: 'Must be a postgresql:// connection string' }
  );

/** PostgreSQL connection string required (for test-db endpoint) */
export const dbUrlRequiredSchema = z
  .string()
  .trim()
  .min(1, 'DB_URL is required')
  .refine((v) => /^postgres(?:ql)?:\/\/[^\s]+$/.test(v), {
    message: 'Must be a postgresql:// connection string',
  });

/** Map of env key -> schema. Empty string typically allowed for optional vars. */
const schemas: Record<string, z.ZodType<string>> = {
  DB_URL: dbUrlSchema,
  APP_URL: urlSchema,
  SECURITY_FRONTEND_URL: urlSchema,
  NEXT_PUBLIC_API_URL: urlSchema,
  NEXT_PUBLIC_APP_URL: urlSchema,
  GITHUB_CALLBACK_URL: urlSchema,
  GITHUB_PROJECT_CALLBACK_URL: urlSchema,
  APP_PORT: portSchema,
  REDIS_PORT: portSchema,
  NODE_ENV: nodeEnvSchema,
  LOG_LEVEL: logLevelSchema,
  CACHE_STRATEGY: cacheStrategySchema,
  SYSTEM_USER_ID: uuidSchema,
  POSTGRES_DB: optionalString,
  POSTGRES_USER: optionalString,
  POSTGRES_PASSWORD: optionalString,
  REDIS_PASSWORD: optionalString,
  PGADMIN_EMAIL: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Must be a valid email'),
  PGADMIN_PASSWORD: optionalString,
  GRAFANA_ADMIN_PASSWORD: optionalString,
  COLLECTOR_OTLP_ENABLED: booleanSchema,
  UMAMI_DB_PASSWORD: optionalString,
  UMAMI_APP_SECRET: optionalString,
  REDIS_HOST: optionalString,
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  SECURITY_ADDITIONAL_ORIGINS: optionalString,
  SECURITY_ENABLE_HELMET: booleanSchema,
  SECURITY_ENABLE_RATE_LIMIT: booleanSchema,
  SECURITY_RATE_LIMIT_MAX: positiveIntSchema,
  SECURITY_RATE_LIMIT_WINDOW_MINUTES: positiveIntSchema,
  SECURITY_RATE_LIMIT_AUTH_MAX: positiveIntSchema,
  SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES: positiveIntSchema,
  SECURITY_RATE_LIMIT_PER_TENANT_ENABLED: booleanSchema,
  SECURITY_RATE_LIMIT_PER_TENANT_MAX: positiveIntSchema,
  SECURITY_RATE_LIMIT_PER_TENANT_WINDOW_MINUTES: positiveIntSchema,
  SECURITY_API_KEY: optionalString,
  SECURITY_ENABLE_RLS: booleanSchema,
  SECURITY_RLS_ROLE: optionalString,
  CORS_DEV_ORIGINS: optionalString,
  LOG_PRETTY_PRINT: booleanSchema,
  DB_POOL_MAX: positiveIntSchema,
  DB_POOL_MIN: positiveIntSchema,
  DB_CONNECTION_TIMEOUT: positiveIntSchema,
  DB_IDLE_TIMEOUT: positiveIntSchema,
  DB_QUERY_TIMEOUT: positiveIntSchema,
  DB_LOG_QUERIES: booleanSchema,
  JWT_ACCESS_TOKEN_EXPIRATION_MINUTES: positiveIntSchema,
  JWT_REFRESH_TOKEN_EXPIRATION_DAYS: positiveIntSchema,
  JWT_JWKS_MAX_AGE_SECONDS: positiveIntSchema,
  JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS: positiveIntSchema,
  AUTH_PROVIDER_VERIFICATION_EXPIRATION_DAYS: positiveIntSchema,
  AUTH_OTP_VALIDITY_MINUTES: positiveIntSchema,
  AUTH_MAX_FAILED_LOGIN_ATTEMPTS: positiveIntSchema,
  AUTH_LOCKOUT_DURATION_MINUTES: positiveIntSchema,
  AUTH_PASSWORD_RESET_OTP_VALIDITY_MINUTES: positiveIntSchema,
  TOKEN_DEFAULT_VALIDITY_MINUTES: positiveIntSchema,
  TOKEN_DEFAULT_LENGTH: positiveIntSchema,
  TOKEN_BCRYPT_ROUNDS: positiveIntSchema,
  CACHE_DEFAULT_TTL: positiveIntSchema,
  CACHE_MAX_SIZE: positiveIntSchema,
  REDIS_DB: positiveIntSchema,
  REDIS_CONNECTION_TIMEOUT: positiveIntSchema,
  REDIS_ENABLE_TLS: booleanSchema,
  REDIS_KEY_PREFIX: optionalString,
  METRICS_ENABLED: booleanSchema,
  METRICS_COLLECT_DEFAULTS: booleanSchema,
  TRACING_ENABLED: booleanSchema,
  TRACING_SAMPLING_RATE: optionalString,
  APOLLO_INTROSPECTION: booleanSchema,
  APOLLO_PLAYGROUND: booleanSchema,
  APOLLO_INCLUDE_STACKTRACE: booleanSchema,
  SWAGGER_ENABLED: booleanSchema,
  SWAGGER_PERSIST_AUTHORIZATION: booleanSchema,
  SWAGGER_DISPLAY_REQUEST_DURATION: booleanSchema,
  SWAGGER_FILTER: booleanSchema,
  SWAGGER_TRY_IT_OUT_ENABLED: booleanSchema,
  SWAGGER_MODELS_EXPAND_DEPTH: positiveIntSchema,
  SWAGGER_MODEL_EXPAND_DEPTH: positiveIntSchema,
  SWAGGER_DEEP_LINKING: booleanSchema,
  SWAGGER_DISPLAY_OPERATION_ID: booleanSchema,
  SWAGGER_SHOW_EXTENSIONS: booleanSchema,
  SWAGGER_SHOW_COMMON_EXTENSIONS: booleanSchema,
  I18N_DEBUG: booleanSchema,
  SMTP_SECURE: booleanSchema,
  JOBS_ENABLED: booleanSchema,
  JOBS_DATA_RETENTION_ENABLED: booleanSchema,
  JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED: booleanSchema,
  JOBS_BULLMQ_ATTEMPTS: positiveIntSchema,
  JOBS_BULLMQ_BACKOFF_DELAY: positiveIntSchema,
  JOBS_BULLMQ_REMOVE_ON_COMPLETE_AGE: positiveIntSchema,
  JOBS_BULLMQ_REMOVE_ON_FAIL_AGE: positiveIntSchema,
  PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS: positiveIntSchema,
  PRIVACY_BACKUP_RETENTION_DAYS: positiveIntSchema,
  GITHUB_OAUTH_STATE_VALIDITY_MINUTES: positiveIntSchema,
  OAUTH_CLI_CALLBACK_TTL_SECONDS: positiveIntSchema,
  STORAGE_UPLOAD_MAX_FILE_SIZE: positiveIntSchema,
  SMTP_PORT: portSchema,
};

export type EnvValidationResult = { success: true } | { success: false; error: string };

/**
 * Validate a single env value by key. Returns success or error message.
 * If no schema is defined for the key, allows any string.
 */
export function validateEnvValue(key: string, value: string): EnvValidationResult {
  const schema = schemas[key];
  if (!schema) return { success: true };

  const result = schema.safeParse(value);
  if (result.success) return { success: true };
  const err = result.error;
  const first =
    (err.flatten().formErrors as string[])[0] ??
    err.issues[0]?.message ??
    err.message;
  return { success: false, error: first };
}
