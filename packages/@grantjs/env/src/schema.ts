/**
 * Zod schema for Grant platform environment variables.
 * Raw variables only; no derived values. Applications load dotenv at entrypoints;
 * this package only parses process.env.
 */

import { z } from 'zod';

const optionalString = (defaultValue = '') => z.string().optional().default(defaultValue);

const optionalNumber = (defaultValue: number) => z.coerce.number().optional().default(defaultValue);

const optionalBoolean = (defaultValue: boolean) =>
  z
    .union([z.string(), z.undefined()])
    .transform((s) => {
      if (s?.toLowerCase() === 'true' || s === '1') return true;
      if (s?.toLowerCase() === 'false' || s === '0') return false;
      return defaultValue;
    })
    .default(defaultValue);

/** Schema for all env vars used by API, DB scripts, and E2E. Uses defaults so parse succeeds in minimal env. */
export const envSchema = z.object({
  // Core / app
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  APP_URL: optionalString('http://localhost:4000'),
  DOCS_URL: optionalString('http://localhost:5173'),
  API_PORT: optionalNumber(4000),
  /** SIGTERM/SIGINT: max ms for Apollo/HTTP/jobs/cache/DB shutdown before forced exit. Keep below K8s terminationGracePeriodSeconds. */
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: optionalNumber(25000),
  SYSTEM_USER_ID: optionalString('00000000-0000-0000-0000-000000000000'),

  // Database: DB_URL or POSTGRES_* for derivation
  DB_URL: optionalString(''),
  POSTGRES_HOST: optionalString('localhost'),
  POSTGRES_PORT: optionalNumber(5432),
  POSTGRES_USER: optionalString('grant_user'),
  POSTGRES_PASSWORD: optionalString('grant_password'),
  POSTGRES_DB: optionalString('grant_db'),

  DB_POOL_MAX: optionalNumber(20),
  DB_POOL_MIN: optionalNumber(2),
  DB_CONNECTION_TIMEOUT: optionalNumber(30),
  DB_IDLE_TIMEOUT: optionalNumber(20),
  DB_QUERY_TIMEOUT: optionalNumber(60000),
  DB_LOG_QUERIES: optionalBoolean(true),

  // JWT / Auth / Token
  JWT_ACCESS_TOKEN_EXPIRATION_MINUTES: optionalNumber(15),
  JWT_REFRESH_TOKEN_EXPIRATION_DAYS: optionalNumber(30),
  JWT_JWKS_MAX_AGE_SECONDS: optionalNumber(300),
  JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS: optionalNumber(300),
  AUTH_PROVIDER_VERIFICATION_EXPIRATION_DAYS: optionalNumber(7),
  AUTH_OTP_VALIDITY_MINUTES: optionalNumber(5),
  AUTH_PASSWORD_RESET_OTP_VALIDITY_MINUTES: optionalNumber(60),
  AUTH_MAX_FAILED_LOGIN_ATTEMPTS: optionalNumber(5),
  AUTH_LOCKOUT_DURATION_MINUTES: optionalNumber(15),
  AUTH_MFA_TOTP_ISSUER: optionalString('Grant'),
  AUTH_MFA_TOTP_PERIOD_SECONDS: optionalNumber(30),
  AUTH_MFA_TOTP_WINDOW: optionalNumber(1),
  AUTH_MFA_VERIFY_MAX_ATTEMPTS: optionalNumber(5),
  AUTH_MFA_VERIFY_WINDOW_MINUTES: optionalNumber(15),
  AUTH_MFA_SESSION_TTL_MINUTES: optionalNumber(1440),
  AUTH_MFA_SECRET_ENCRYPTION_KEY: optionalString(''),
  /** Preferred: minimum AAL required after login for general API access (`aal1` | `aal2`). */
  AUTH_MIN_AAL_AT_LOGIN: z
    .string()
    .optional()
    .transform((s) => (s === 'aal2' ? 'aal2' : 'aal1')),
  /** When > 0, session `auth_time` older than this (seconds) may require step-up (future enforcement). */
  AUTH_MFA_STEP_UP_MAX_AGE_SECONDS: optionalNumber(0),
  TOKEN_DEFAULT_VALIDITY_MINUTES: optionalNumber(60),
  TOKEN_DEFAULT_LENGTH: optionalNumber(32),
  TOKEN_BCRYPT_ROUNDS: optionalNumber(10),

  // GitHub / OAuth
  GITHUB_CLIENT_ID: optionalString(''),
  GITHUB_CLIENT_SECRET: optionalString(''),
  GITHUB_CALLBACK_URL: optionalString('http://localhost:4000/api/auth/github/callback'),
  GITHUB_PROJECT_CALLBACK_URL: optionalString('http://localhost:4000/api/auth/project/callback'),
  GITHUB_AUTHORIZATION_URL: optionalString('https://github.com/login/oauth/authorize'),
  GITHUB_TOKEN_URL: optionalString('https://github.com/login/oauth/access_token'),
  GITHUB_API_URL: optionalString('https://api.github.com'),
  GITHUB_OAUTH_STATE_VALIDITY_MINUTES: optionalNumber(10),
  GITHUB_DEFAULT_AVATAR_URL: optionalString('https://github.com/identicons/placeholder'),
  OAUTH_CLI_CALLBACK_TTL_SECONDS: optionalNumber(60),
  PROJECT_OAUTH_EMAIL_ENTRY_URL: optionalString(''),
  PROJECT_OAUTH_CONSENT_URL: optionalString(''),

  // Cache / Redis
  CACHE_STRATEGY: z.enum(['memory', 'redis']).optional().default('memory'),
  CACHE_DEFAULT_TTL: optionalNumber(3600),
  CACHE_MAX_SIZE: optionalNumber(100 * 1024 * 1024),
  REDIS_HOST: optionalString('localhost'),
  REDIS_PORT: optionalNumber(6379),
  REDIS_PASSWORD: optionalString(''),
  REDIS_DB: optionalNumber(0),
  REDIS_KEY_PREFIX: optionalString('grant:'),
  REDIS_CONNECTION_TIMEOUT: optionalNumber(10000),
  REDIS_ENABLE_TLS: optionalBoolean(false),

  // Security
  SECURITY_FRONTEND_URL: optionalString('http://localhost:3000'),
  SECURITY_ADDITIONAL_ORIGINS: optionalString(''),
  SECURITY_ENABLE_HELMET: optionalBoolean(true),
  /** When undefined, API config derives from NODE_ENV (production -> true) */
  SECURITY_ENABLE_RATE_LIMIT: z
    .union([z.string(), z.undefined()])
    .transform((s) => s?.toLowerCase() === 'true' || s === '1')
    .optional(),
  SECURITY_RATE_LIMIT_MAX: optionalNumber(100),
  SECURITY_RATE_LIMIT_WINDOW_MINUTES: optionalNumber(15),
  SECURITY_RATE_LIMIT_AUTH_MAX: optionalNumber(20),
  SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES: optionalNumber(15),
  SECURITY_RATE_LIMIT_PER_TENANT_ENABLED: optionalBoolean(false),
  SECURITY_RATE_LIMIT_PER_TENANT_MAX: optionalNumber(200),
  SECURITY_RATE_LIMIT_PER_TENANT_WINDOW_MINUTES: optionalNumber(15),
  SECURITY_RLS_ROLE: optionalString('grant_app_restricted'),
  SECURITY_ENABLE_RLS: optionalBoolean(true),
  SECURITY_API_KEY: optionalString(''),
  CORS_DEV_ORIGINS: optionalString(
    'http://localhost:3000,http://localhost:3001,https://studio.apollographql.com,https://apollo-studio-embed.vercel.app'
  ),

  // Apollo / Swagger (when undefined, API config derives from NODE_ENV)
  APOLLO_INTROSPECTION: z
    .union([z.string(), z.undefined()])
    .transform((s) => s?.toLowerCase() === 'true' || s === '1')
    .optional(),
  APOLLO_PLAYGROUND: z
    .union([z.string(), z.undefined()])
    .transform((s) => s?.toLowerCase() === 'true' || s === '1')
    .optional(),
  APOLLO_INCLUDE_STACKTRACE: z
    .union([z.string(), z.undefined()])
    .transform((s) => s?.toLowerCase() === 'true' || s === '1')
    .optional(),
  SWAGGER_ENABLED: optionalBoolean(true),
  SWAGGER_SITE_TITLE: optionalString('Grant API Docs'),
  SWAGGER_PERSIST_AUTHORIZATION: optionalBoolean(true),
  SWAGGER_DISPLAY_REQUEST_DURATION: optionalBoolean(true),
  SWAGGER_FILTER: optionalBoolean(true),
  SWAGGER_TRY_IT_OUT_ENABLED: optionalBoolean(true),
  SWAGGER_MODELS_EXPAND_DEPTH: optionalNumber(3),
  SWAGGER_MODEL_EXPAND_DEPTH: optionalNumber(3),
  SWAGGER_DOC_EXPANSION: z.enum(['list', 'full', 'none']).optional().default('list'),
  SWAGGER_DEEP_LINKING: optionalBoolean(true),
  SWAGGER_DISPLAY_OPERATION_ID: optionalBoolean(false),
  SWAGGER_SYNTAX_THEME: z
    .enum(['agate', 'arta', 'monokai', 'nord', 'obsidian', 'tomorrow-night'])
    .optional()
    .default('monokai'),
  SWAGGER_SHOW_EXTENSIONS: optionalBoolean(true),
  SWAGGER_SHOW_COMMON_EXTENSIONS: optionalBoolean(true),
  OPENAPI_PRODUCTION_URL: optionalString('https://api.grantjs.org'),

  // I18n
  I18N_DEFAULT_LOCALE: z.enum(['en', 'de']).optional().default('en'),
  I18N_DEBUG: optionalBoolean(false),

  // Email
  EMAIL_PROVIDER: z
    .enum(['console', 'mailgun', 'mailjet', 'ses', 'smtp'])
    .optional()
    .default('console'),
  EMAIL_FROM: optionalString('noreply@yourdomain.com'),
  EMAIL_FROM_NAME: optionalString('Grant'),
  MAILGUN_API_KEY: optionalString(''),
  MAILGUN_DOMAIN: optionalString(''),
  MAILJET_API_KEY: optionalString(''),
  MAILJET_SECRET_KEY: optionalString(''),
  EMAIL_SES_CLIENT_ID: optionalString(''),
  EMAIL_SES_CLIENT_SECRET: optionalString(''),
  EMAIL_SES_REGION: optionalString('us-east-1'),
  SMTP_HOST: optionalString('smtp.example.com'),
  SMTP_PORT: optionalNumber(587),
  SMTP_SECURE: optionalBoolean(false),
  SMTP_USER: optionalString(''),
  SMTP_PASSWORD: optionalString(''),

  // Logging (when undefined, API config derives from NODE_ENV: production -> 'info')
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),
  LOG_PRETTY_PRINT: optionalBoolean(true),

  // Metrics / Telemetry / Analytics / Tracing
  METRICS_ENABLED: optionalBoolean(false),
  METRICS_ENDPOINT: optionalString('/metrics'),
  METRICS_COLLECT_DEFAULTS: optionalBoolean(true),
  TELEMETRY_PROVIDER: z.enum(['none', 'cloudwatch']).optional().default('none'),
  TELEMETRY_CLOUDWATCH_REGION: optionalString('us-east-1'),
  TELEMETRY_CLOUDWATCH_LOG_GROUP: optionalString(''),
  TELEMETRY_CLOUDWATCH_LOG_STREAM_PREFIX: optionalString('grant-api'),
  ANALYTICS_ENABLED: optionalBoolean(false),
  ANALYTICS_PROVIDER: z.enum(['none', 'umami']).optional().default('none'),
  ANALYTICS_UMAMI_API_URL: optionalString(''),
  ANALYTICS_UMAMI_WEBSITE_ID: optionalString(''),
  ANALYTICS_UMAMI_HOSTNAME: optionalString('grant-api'),
  TRACING_ENABLED: optionalBoolean(false),
  TRACING_BACKEND: z.enum(['jaeger', 'otlp', 'xray']).optional().default('jaeger'),
  JAEGER_ENDPOINT: optionalString('http://localhost:14268/api/traces'),
  OTLP_ENDPOINT: optionalString('http://localhost:4318/v1/traces'),
  TRACING_SAMPLING_RATE: optionalNumber(1),
  TRACING_SERVICE_NAME: optionalString('grant-api'),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3']).optional().default('local'),
  STORAGE_LOCAL_BASE_PATH: optionalString('./storage'),
  STORAGE_S3_BUCKET: optionalString(''),
  STORAGE_S3_REGION: optionalString('us-east-1'),
  STORAGE_S3_ACCESS_KEY_ID: optionalString(''),
  STORAGE_S3_SECRET_ACCESS_KEY: optionalString(''),
  STORAGE_S3_ENDPOINT: optionalString(''),
  STORAGE_S3_PUBLIC_URL: optionalString(''),
  STORAGE_UPLOAD_MAX_FILE_SIZE: optionalNumber(5 * 1024 * 1024),

  // Privacy / Jobs / Demo
  PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS: optionalNumber(30),
  PRIVACY_BACKUP_RETENTION_DAYS: optionalNumber(90),
  JOBS_ENABLED: optionalBoolean(true),
  JOBS_PROVIDER: z.enum(['node-cron', 'bullmq']).optional().default('node-cron'),
  JOBS_DATA_RETENTION_SCHEDULE: optionalString('0 2 * * *'),
  JOBS_DATA_RETENTION_ENABLED: optionalBoolean(true),
  JOBS_SYSTEM_SIGNING_KEY_ROTATION_SCHEDULE: optionalString('0 0 1 * *'),
  JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED: optionalBoolean(false),
  JOBS_BULLMQ_ATTEMPTS: optionalNumber(3),
  JOBS_BULLMQ_BACKOFF_TYPE: z.enum(['exponential', 'fixed']).optional().default('exponential'),
  JOBS_BULLMQ_BACKOFF_DELAY: optionalNumber(2000),
  JOBS_BULLMQ_REMOVE_ON_COMPLETE_AGE: optionalNumber(7 * 24 * 3600),
  JOBS_BULLMQ_REMOVE_ON_FAIL_AGE: optionalNumber(30 * 24 * 3600),
  DEMO_MODE_ENABLED: optionalBoolean(false),
  DEMO_MODE_DB_REFRESH_SCHEDULE: optionalString('0 0 */2 * *'),

  // E2E / test
  E2E_API_BASE_URL: optionalString('http://localhost:4000'),
  E2E_DB_URL: optionalString(''),
  E2E_REDIS_HOST: optionalString('localhost'),
  E2E_REDIS_PORT: optionalString('6380'),
  E2E_REDIS_PASSWORD: optionalString('grant_redis_password'),
  BENCHMARK_REPORT: optionalString(''),
  APP_VERSION: optionalString('1.0.0'),
  NEXT_PUBLIC_APP_VERSION: optionalString(''),
});

export type Env = z.infer<typeof envSchema>;
