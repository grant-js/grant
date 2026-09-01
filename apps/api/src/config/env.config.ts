/**
 * Environment Configuration Module
 *
 * Centralized, type-safe config built from @grantjs/env. Applications load dotenv at
 * entrypoints; this module calls getEnv() and builds derived config.
 */

import { getEnv, resolveDatabaseUrl } from '@grantjs/env';
import { SUPPORTED_LOCALES } from '@grantjs/i18n';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import { ConfigurationError } from '@/lib/errors';
import { readPlatformVersion } from '@/lib/platform-version.lib';

const env = getEnv();

/** Effective minimum AAL at login for policy (`AUTH_MIN_AAL_AT_LOGIN`). */
function resolveMinAalAtLogin(): 'aal1' | 'aal2' {
  return env.AUTH_MIN_AAL_AT_LOGIN === 'aal2' ? 'aal2' : 'aal1';
}

// ============================================================================
// Application Configuration
// ============================================================================

const APP_CONFIG = {
  /** Application name */
  name: 'Grant API',

  /** Application version (from apps/api/package.json; matches Docker semver tags) */
  version: readPlatformVersion(),

  /** Server port */
  port: env.API_PORT,

  /** Max JSON request body size for Express (bytes); from `API_JSON_BODY_LIMIT_BYTES`. */
  jsonBodyLimitBytes: env.API_JSON_BODY_LIMIT_BYTES,

  /** Node environment */
  nodeEnv: env.NODE_ENV,

  /** Whether the app is running in production */
  isProduction: env.NODE_ENV === 'production',

  /** Whether the app is running in development */
  isDevelopment: env.NODE_ENV === 'development',

  /** Whether the app is running in test mode */
  isTest: env.NODE_ENV === 'test',

  /**
   * API base URL. Used as JWT iss (issuer) and aud (audience) for session and API key tokens.
   */
  url: env.APP_URL,

  /** Public docs site URL (for runtime config consumed by web/docs) */
  docsUrl: env.DOCS_URL,

  /** Graceful shutdown budget (ms); from `GRACEFUL_SHUTDOWN_TIMEOUT_MS`. */
  gracefulShutdownTimeoutMs: env.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
} as const;

// ============================================================================
// Database Configuration
// ============================================================================

const DB_CONFIG = {
  /** PostgreSQL connection string */
  url: resolveDatabaseUrl(env),

  /** Maximum number of connections in the pool */
  poolMax: env.DB_POOL_MAX,

  /** Minimum number of connections in the pool */
  poolMin: env.DB_POOL_MIN,

  /** Connection timeout in seconds */
  connectionTimeout: env.DB_CONNECTION_TIMEOUT,

  /** Idle timeout in seconds - how long a connection can be idle before being closed */
  idleTimeout: env.DB_IDLE_TIMEOUT,

  /** Query timeout in milliseconds */
  queryTimeout: env.DB_QUERY_TIMEOUT,

  /** Enable query logging */
  logQueries: env.DB_LOG_QUERIES,

  /** Run migrations and the core seed at API start (`DB_BOOTSTRAP_ON_BOOT`). */
  bootstrapOnBoot: env.DB_BOOTSTRAP_ON_BOOT,

  /** Migrations folder override (`DB_MIGRATIONS_DIR`); empty resolves from the package. */
  migrationsDir: env.DB_MIGRATIONS_DIR,
} as const;

// ============================================================================
// JWT Configuration
// ============================================================================

const JWT_CONFIG = {
  /** Access token expiration in minutes */
  accessTokenExpirationMinutes: env.JWT_ACCESS_TOKEN_EXPIRATION_MINUTES,

  /** Refresh token expiration in days. Drives JWKS key retention (which rotated keys to expose), not a cache TTL. */
  refreshTokenExpirationDays: env.JWT_REFRESH_TOKEN_EXPIRATION_DAYS,

  /** Cache-Control max-age for GET /.well-known/jwks.json response (seconds). For external verifiers only. */
  jwksMaxAgeSeconds: env.JWT_JWKS_MAX_AGE_SECONDS,

  /** TTL in seconds for in-app key caches: system signing key and verification keys by kid (GrantService). Invalidated on rotation for signing key; verification keys use TTL only. */
  systemSigningKeyCacheTtlSeconds: env.JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS,
} as const;

// ============================================================================
// Authentication Configuration
// ============================================================================

const AUTH_CONFIG = {
  /** Provider verification token expiration in days */
  providerVerificationExpirationDays: env.AUTH_PROVIDER_VERIFICATION_EXPIRATION_DAYS,

  /** OTP (One-Time Password) verification token validity in minutes (backend enforces this; also shown in verification email). */
  otpValidityMinutes: env.AUTH_OTP_VALIDITY_MINUTES,

  /** Password reset OTP validity in minutes */
  passwordResetOtpValidityMinutes: env.AUTH_PASSWORD_RESET_OTP_VALIDITY_MINUTES,

  /** Maximum number of failed login attempts before lockout */
  maxFailedLoginAttempts: env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS,

  /** Account lockout duration in minutes */
  lockoutDurationMinutes: env.AUTH_LOCKOUT_DURATION_MINUTES,

  /** MFA (TOTP) configuration */
  mfa: {
    /** Issuer shown in authenticator apps for otpauth URIs */
    totpIssuer: env.AUTH_MFA_TOTP_ISSUER,

    /** TOTP period in seconds (RFC 6238 default: 30) */
    totpPeriodSeconds: env.AUTH_MFA_TOTP_PERIOD_SECONDS,

    /** Allowed time-window drift in steps during TOTP verification */
    totpWindow: env.AUTH_MFA_TOTP_WINDOW,

    /** Maximum MFA verification attempts per window */
    verifyMaxAttempts: env.AUTH_MFA_VERIFY_MAX_ATTEMPTS,

    /** MFA verification attempt window in minutes */
    verifyWindowMinutes: env.AUTH_MFA_VERIFY_WINDOW_MINUTES,

    /** Optional session-level MFA validity window in minutes */
    sessionTtlMinutes: env.AUTH_MFA_SESSION_TTL_MINUTES,

    /** Symmetric key used to encrypt persisted MFA secrets (when configured) */
    secretEncryptionKey: env.AUTH_MFA_SECRET_ENCRYPTION_KEY || undefined,
  },

  /**
   * Minimum AAL expected for general API access after login when the user has MFA enrolled.
   * `aal2` means the user must complete MFA (step-up) before most routes; safe AAL1 routes are explicit.
   * From `AUTH_MIN_AAL_AT_LOGIN`.
   */
  minAalAtLogin: resolveMinAalAtLogin(),

  /** When &gt; 0, MFA step-up max age via `mfa_auth_time` (0 = disabled). */
  mfaStepUpMaxAgeSeconds: env.AUTH_MFA_STEP_UP_MAX_AGE_SECONDS,
} as const;

// ============================================================================
// Token Generation Configuration
// ============================================================================

const TOKEN_CONFIG = {
  /** Default validity period in minutes for secure tokens (e.g. OTP, verification) */
  defaultValidityMinutes: env.TOKEN_DEFAULT_VALIDITY_MINUTES,

  /** Default token length in bytes (hex-encoded output will be 2x this value) */
  defaultTokenLength: env.TOKEN_DEFAULT_LENGTH,

  /** Number of bcrypt hashing rounds for secrets (higher = slower but more secure) */
  bcryptRounds: env.TOKEN_BCRYPT_ROUNDS,
} as const;

// ============================================================================
// GitHub OAuth Configuration
// ============================================================================

const GITHUB_OAUTH_CONFIG = {
  /** GitHub OAuth Client ID */
  clientId: env.GITHUB_CLIENT_ID,

  /** GitHub OAuth Client Secret */
  clientSecret: env.GITHUB_CLIENT_SECRET,

  /** GitHub OAuth callback URL */
  callbackUrl: env.GITHUB_CALLBACK_URL,

  /** GitHub OAuth callback URL for project app flow (must be registered in GitHub app) */
  projectCallbackUrl: env.GITHUB_PROJECT_CALLBACK_URL,

  /** GitHub OAuth authorization URL */
  authorizationUrl: env.GITHUB_AUTHORIZATION_URL,

  /** GitHub OAuth token URL */
  tokenUrl: env.GITHUB_TOKEN_URL,

  /** GitHub API base URL */
  apiUrl: env.GITHUB_API_URL,

  /** OAuth scopes to request */
  scopes: ['user:email', 'read:user'],

  /** State token validity in minutes (OAuth flow protection) */
  stateValidityMinutes: env.GITHUB_OAUTH_STATE_VALIDITY_MINUTES,

  /** Default avatar URL used when a GitHub user has no avatar */
  defaultAvatarUrl: env.GITHUB_DEFAULT_AVATAR_URL,

  /** TTL in seconds for CLI OAuth callback payloads stored in cache */
  cliCallbackTtlSeconds: env.OAUTH_CLI_CALLBACK_TTL_SECONDS,
} as const;

/**
 * Subset of UserAuthenticationMethodProvider (schema) that is supported in the project OAuth flow.
 * Single source of truth: schema enum; this list defines which are implemented for project apps.
 */
export const PROJECT_OAUTH_PROVIDERS = [
  UserAuthenticationMethodProvider.Github,
  UserAuthenticationMethodProvider.Email,
] as const;
export type ProjectOAuthProvider = (typeof PROJECT_OAUTH_PROVIDERS)[number];

const PROJECT_OAUTH_CONFIG = {
  /**
   * URL for project-scoped email auth entry (provider=email).
   * Tenant app or frontend hosts the "enter email" page; user is redirected here with client_id, redirect_uri, state.
   * Handler injects default locale (e.g. /en/) when building redirects; if set via env, include locale in path for next-intl.
   */
  emailEntryUrl:
    env.PROJECT_OAUTH_EMAIL_ENTRY_URL ||
    (env.SECURITY_FRONTEND_URL
      ? `${env.SECURITY_FRONTEND_URL}/auth/project/email`
      : 'http://localhost:3000/auth/project/email'),
  /**
   * URL for project-scoped OAuth consent (post-auth). Frontend page that shows scopes and Allow/Deny.
   * Handler injects default locale (e.g. /en/) when building redirects; if set via env, include locale in path for next-intl.
   */
  consentUrl:
    env.PROJECT_OAUTH_CONSENT_URL ||
    (env.SECURITY_FRONTEND_URL
      ? `${env.SECURITY_FRONTEND_URL}/auth/project/consent`
      : 'http://localhost:3000/auth/project/consent'),

  /** TTL in seconds for the project OAuth state token. */
  stateTtlSeconds: env.PROJECT_OAUTH_STATE_TTL_SECONDS,

  /** TTL in seconds for project OAuth email magic-link tokens. */
  emailTokenTtlSeconds: env.PROJECT_OAUTH_EMAIL_TOKEN_TTL_SECONDS,

  /** TTL in seconds for the post-auth consent token. */
  consentTtlSeconds: env.PROJECT_OAUTH_CONSENT_TTL_SECONDS,
} as const;

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_CONFIG = {
  /** Cache strategy: 'memory' for single instance, 'redis' or 'dynamodb' for distributed */
  strategy: env.CACHE_STRATEGY,

  /**
   * DynamoDB backing store (`CACHE_STRATEGY=dynamodb`). Credentials stay
   * undefined unless explicitly configured, so the AWS default credential chain
   * applies and a task or Lambda role can supply them instead.
   */
  dynamodb: {
    tableName: env.CACHE_DYNAMODB_TABLE,
    region: env.CACHE_DYNAMODB_REGION,
    endpoint: env.CACHE_DYNAMODB_ENDPOINT || undefined,
    accessKeyId: env.CACHE_DYNAMODB_ACCESS_KEY_ID || undefined,
    secretAccessKey: env.CACHE_DYNAMODB_SECRET_ACCESS_KEY || undefined,
  },

  /** Default TTL (Time To Live) in seconds */
  defaultTtl: env.CACHE_DEFAULT_TTL,

  /** Maximum cache size in bytes (for in-memory cache) */
  maxSize: env.CACHE_MAX_SIZE,
} as const;

// ============================================================================
// Redis Configuration
// ============================================================================

const REDIS_CONFIG = {
  /** Redis server hostname */
  host: env.REDIS_HOST,

  /** Redis server port */
  port: env.REDIS_PORT,

  /** Redis authentication password */
  password: env.REDIS_PASSWORD || undefined,

  /** Redis database number */
  database: env.REDIS_DB,

  /** Redis key prefix for namespacing */
  keyPrefix: env.REDIS_KEY_PREFIX,

  /** Connection timeout in milliseconds */
  connectionTimeout: env.REDIS_CONNECTION_TIMEOUT,

  /** Enable TLS for Redis connection */
  enableTls: env.REDIS_ENABLE_TLS,
} as const;

// ============================================================================
// Security Configuration
// ============================================================================

// ============================================================================
// Secrets Configuration
// ============================================================================

/**
 * Which resolver supplies deployment secrets. Default 'env' reads them from the
 * process environment, which is what every deployment did before this existed.
 */
const SECRETS_CONFIG = {
  provider: env.SECRETS_PROVIDER,
  awsSecretsManager: {
    secretId: env.SECRETS_AWS_SECRET_ID,
    region: env.SECRETS_AWS_REGION,
    endpoint: env.SECRETS_AWS_ENDPOINT || undefined,
    cacheTtlSeconds: env.SECRETS_CACHE_TTL_SECONDS,
  },
} as const;

const SECURITY_CONFIG = {
  /** Frontend URL for CORS */
  frontendUrl: env.SECURITY_FRONTEND_URL,

  /** Additional allowed origins for CORS (comma-separated) */
  additionalOrigins: env.SECURITY_ADDITIONAL_ORIGINS
    ? env.SECURITY_ADDITIONAL_ORIGINS.split(',')
        .map((o: string) => o.trim())
        .filter(Boolean)
    : [],

  /** Enable Helmet security headers */
  enableHelmet: env.SECURITY_ENABLE_HELMET,

  /**
   * Header naming the real client IP. Empty keeps the historical `x-forwarded-for`
   * handling; see `getClientIp` for why an edge-set header is not interchangeable
   * with it.
   */
  trustedClientIpHeader: env.SECURITY_TRUSTED_CLIENT_IP_HEADER.trim().toLowerCase(),

  /** Header carrying the CDN's shared secret. Enforced only when a secret resolves. */
  originVerifyHeader: env.SECURITY_ORIGIN_VERIFY_HEADER.trim().toLowerCase(),

  /**
   * Whether a missing origin-verification secret is fatal to the request rather than
   * a pass-through. True wherever the origin is publicly reachable.
   */
  originVerifyRequired: env.SECURITY_ORIGIN_VERIFY_REQUIRED,

  /** Enable rate limiting (default: true in production when not set) */
  enableRateLimit: env.SECURITY_ENABLE_RATE_LIMIT ?? APP_CONFIG.isProduction,

  /** Rate limit: maximum requests per window */
  rateLimitMax: env.SECURITY_RATE_LIMIT_MAX,

  /** Rate limit: time window in minutes */
  rateLimitWindowMinutes: env.SECURITY_RATE_LIMIT_WINDOW_MINUTES,

  /** Rate limit (auth endpoints): maximum requests per window (login, refresh, cli-callback, token) */
  rateLimitAuthMax: env.SECURITY_RATE_LIMIT_AUTH_MAX,

  /** Rate limit (auth endpoints): time window in minutes */
  rateLimitAuthWindowMinutes: env.SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES,

  /** Enable per-tenant rate limiting (noisy neighbor protection). When enabled, authenticated requests with scope are also limited by tenant. */
  rateLimitPerTenantEnabled: env.SECURITY_RATE_LIMIT_PER_TENANT_ENABLED,

  /** Per-tenant rate limit: maximum requests per window per tenant (scope.tenant + scope.id) */
  rateLimitPerTenantMax: env.SECURITY_RATE_LIMIT_PER_TENANT_MAX,

  /** Per-tenant rate limit: time window in minutes */
  rateLimitPerTenantWindowMinutes: env.SECURITY_RATE_LIMIT_PER_TENANT_WINDOW_MINUTES,

  /** Enable database Row-Level Security enforcement for scoped requests */
  enableRls: env.SECURITY_ENABLE_RLS,

  /** RLS restricted role name (must match the role created in DB migration) */
  rlsRestrictedRole: env.SECURITY_RLS_ROLE,

  /** API Key for external service authentication (optional) */
  apiKey: env.SECURITY_API_KEY || undefined,
} as const;

// ============================================================================
// Apollo/GraphQL Configuration
// ============================================================================

const APOLLO_CONFIG = {
  /** Enable GraphQL introspection (default: false in production) */
  introspection: env.APOLLO_INTROSPECTION ?? !APP_CONFIG.isProduction,

  /** Enable GraphQL playground (default: true in development) */
  playground: env.APOLLO_PLAYGROUND ?? APP_CONFIG.isDevelopment,

  /** Include stack traces in errors (default: true in development) */
  includeStacktrace: env.APOLLO_INCLUDE_STACKTRACE ?? APP_CONFIG.isDevelopment,
} as const;

// ============================================================================
// Swagger/OpenAPI Configuration
// ============================================================================

const SWAGGER_CONFIG = {
  /** Enable Swagger UI documentation */
  enabled: env.SWAGGER_ENABLED,

  /** Custom site title for Swagger UI */
  siteTitle: env.SWAGGER_SITE_TITLE,

  /** Persist authorization between page refreshes */
  persistAuthorization: env.SWAGGER_PERSIST_AUTHORIZATION,

  /** Display request duration in responses */
  displayRequestDuration: env.SWAGGER_DISPLAY_REQUEST_DURATION,

  /** Enable filter/search in operations */
  filter: env.SWAGGER_FILTER,

  /** Enable "Try it out" by default */
  tryItOutEnabled: env.SWAGGER_TRY_IT_OUT_ENABLED,

  /** Depth to expand models/schemas */
  modelsExpandDepth: env.SWAGGER_MODELS_EXPAND_DEPTH,

  /** Depth to expand individual model properties */
  modelExpandDepth: env.SWAGGER_MODEL_EXPAND_DEPTH,

  /** Documentation expansion: 'list' | 'full' | 'none' */
  docExpansion: env.SWAGGER_DOC_EXPANSION,

  /** Enable deep linking for sharing */
  deepLinking: env.SWAGGER_DEEP_LINKING,

  /** Display operation IDs */
  displayOperationId: env.SWAGGER_DISPLAY_OPERATION_ID,

  /** Syntax highlighting theme */
  syntaxTheme: env.SWAGGER_SYNTAX_THEME,

  /** Show extensions */
  showExtensions: env.SWAGGER_SHOW_EXTENSIONS,

  /** Show common extensions */
  showCommonExtensions: env.SWAGGER_SHOW_COMMON_EXTENSIONS,

  /** Production server URL shown in OpenAPI document (only visible in dev mode) */
  productionUrl: env.OPENAPI_PRODUCTION_URL,
} as const;

// ============================================================================
// i18n Configuration
// ============================================================================

const I18N_CONFIG = {
  /** Supported locales */
  supportedLocales: SUPPORTED_LOCALES,

  /** Default locale */
  defaultLocale: env.I18N_DEFAULT_LOCALE,

  /** Enable i18n debug mode */
  debug: env.I18N_DEBUG,

  /** Locale directory override (`I18N_LOCALES_DIR`); empty resolves from the package. */
  localesDir: env.I18N_LOCALES_DIR,
} as const;

// ============================================================================
// Email Configuration
// ============================================================================

const EMAIL_CONFIG = {
  /** Email provider */
  provider: env.EMAIL_PROVIDER,

  /** From email address */
  from: env.EMAIL_FROM,

  /** From name displayed in emails */
  fromName: env.EMAIL_FROM_NAME || 'Grant',

  /** Mailgun configuration */
  mailgun: {
    apiKey: env.MAILGUN_API_KEY,
    domain: env.MAILGUN_DOMAIN,
  },

  /** Mailjet configuration */
  mailjet: {
    apiKey: env.MAILJET_API_KEY,
    secretKey: env.MAILJET_SECRET_KEY,
  },

  /** AWS SES configuration */
  ses: {
    clientId: env.EMAIL_SES_CLIENT_ID,
    clientSecret: env.EMAIL_SES_CLIENT_SECRET,
    region: env.EMAIL_SES_REGION,
  },

  /** SMTP configuration */
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
  },
} as const;

// ============================================================================
// Logging Configuration
// ============================================================================
// Level is applied at logger bootstrap (apps/api/src/lib/logger) and affects all modules using the shared logger.

const LOGGING_CONFIG = {
  /** Log level: trace, debug, info, warn, error, fatal (default: info in production when not set) */
  level: (env.LOG_LEVEL ?? (APP_CONFIG.isProduction ? 'info' : 'debug')) as
    'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',

  /** Pretty print logs (development only) */
  prettyPrint: env.LOG_PRETTY_PRINT,
} as const;

// ============================================================================
// Metrics Configuration (Prometheus)
// ============================================================================
// When enabled, GET /metrics is served and HTTP request metrics are collected. See docs/advanced-topics/metrics.md.

const METRICS_CONFIG = {
  /** Enable metrics collection and expose GET /metrics */
  enabled: env.METRICS_ENABLED,

  /** Metrics endpoint path (e.g. /metrics) */
  endpoint: env.METRICS_ENDPOINT,

  /** Collect default metrics (CPU, memory, event loop, etc.) when implementation is added */
  collectDefaults: env.METRICS_COLLECT_DEFAULTS,

  /** Default labels for all metrics */
  defaultLabels: {
    environment: APP_CONFIG.nodeEnv,
    service: 'grant-api',
    version: APP_CONFIG.version,
  },
} as const;

// ============================================================================
// Telemetry Configuration (log shipping / tracing adapter)
// ============================================================================

const TELEMETRY_CONFIG = {
  /** Telemetry provider: none (noop) | cloudwatch | emf */
  provider: env.TELEMETRY_PROVIDER,

  /** CloudWatch adapter (used when provider is cloudwatch) */
  cloudwatch: {
    region: env.TELEMETRY_CLOUDWATCH_REGION,
    logGroupName: env.TELEMETRY_CLOUDWATCH_LOG_GROUP,
    logStreamPrefix: env.TELEMETRY_CLOUDWATCH_LOG_STREAM_PREFIX,
  },

  /** Embedded Metric Format adapter (used when provider is emf) */
  emf: {
    namespace: env.TELEMETRY_EMF_NAMESPACE,
    dimensions: env.TELEMETRY_EMF_DIMENSIONS.split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    /** `field:Unit` pairs; a pair missing its unit is ignored rather than defaulted. */
    metrics: Object.fromEntries(
      env.TELEMETRY_EMF_METRICS.split(',')
        .map((pair: string) => pair.split(':').map((part) => part.trim()))
        .filter((parts: string[]) => parts.length === 2 && parts[0] && parts[1])
        .map((parts: string[]) => [parts[0], parts[1]])
    ) as Record<string, string>,
  },
} as const;

// ============================================================================
// Analytics Configuration (optional event tracking via port + adapters)
// ============================================================================

const ANALYTICS_CONFIG = {
  /** Enable analytics (when provider is not 'none') */
  enabled: env.ANALYTICS_ENABLED,

  /** Analytics provider: none | umami */
  provider: env.ANALYTICS_PROVIDER,

  /** Umami adapter (used when provider is umami) */
  umami: {
    apiUrl: env.ANALYTICS_UMAMI_API_URL,
    websiteId: env.ANALYTICS_UMAMI_WEBSITE_ID,
    hostname: env.ANALYTICS_UMAMI_HOSTNAME,
  },
} as const;

// ============================================================================
// Tracing Configuration (OpenTelemetry distributed tracing)
// ============================================================================

const TRACING_CONFIG = {
  /** Enable distributed tracing */
  enabled: env.TRACING_ENABLED,

  /** Trace backend: jaeger | otlp | xray */
  backend: env.TRACING_BACKEND,

  /** Jaeger collector endpoint (for TRACING_BACKEND=jaeger) */
  jaegerEndpoint: env.JAEGER_ENDPOINT,

  /** OTLP trace endpoint (for TRACING_BACKEND=otlp or xray) */
  otlpEndpoint: env.OTLP_ENDPOINT,

  /** Span export strategy: batch (buffered) | simple (per-span) */
  spanProcessor: env.TRACING_SPAN_PROCESSOR,

  /** Sampling rate 0.0 to 1.0 */
  samplingRate: env.TRACING_SAMPLING_RATE,

  /** Service name in traces */
  serviceName: env.TRACING_SERVICE_NAME,
} as const;

// ============================================================================
// File Storage Configuration
// ============================================================================

const STORAGE_CONFIG = {
  /** Storage provider: 'local' | 's3' */
  provider: env.STORAGE_PROVIDER,

  /** Local storage configuration (works for bare metal, Docker volumes, or any filesystem mount) */
  local: {
    /** Base path for local file storage (can be local directory, Docker volume mount, etc.) */
    basePath: env.STORAGE_LOCAL_BASE_PATH,
    /** Content type mappings for file extensions */
    contentTypes: {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    } as Record<string, string>,
  },

  /** S3 storage configuration */
  s3: {
    /** S3 bucket name */
    bucket: env.STORAGE_S3_BUCKET,
    /** AWS region */
    region: env.STORAGE_S3_REGION,
    /** AWS access key ID */
    accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID || undefined,
    /** AWS secret access key */
    secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY || undefined,
    /** Custom S3 endpoint (for S3-compatible services like MinIO) */
    endpoint: env.STORAGE_S3_ENDPOINT || undefined,
    /** Public URL base (e.g., CloudFront distribution URL) */
    publicUrl: env.STORAGE_S3_PUBLIC_URL || undefined,
  },

  /** File upload validation configuration */
  upload: {
    /** Maximum file size in bytes (default: 5MB) */
    maxFileSize: env.STORAGE_UPLOAD_MAX_FILE_SIZE,
    /** Allowed MIME types for file uploads */
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
    /** Allowed file extensions */
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const,
  },
} as const;

// ============================================================================
// Privacy & Data Retention Configuration
// ============================================================================

const PRIVACY_CONFIG = {
  /** Data retention period in days for deleted accounts (default: 30) */
  accountDeletionRetentionDays: env.PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS,

  /** Data retention period in days for backups (default: 90) */
  backupRetentionDays: env.PRIVACY_BACKUP_RETENTION_DAYS,
} as const;

// ============================================================================
// Job Scheduling Configuration
// ============================================================================

const JOB_CONFIG = {
  /** Enable job scheduling */
  enabled: env.JOBS_ENABLED,

  /** Job scheduling provider: 'node-cron' | 'bullmq' */
  provider: env.JOBS_PROVIDER,

  /** Redis connection for BullMQ (uses existing Redis config if available) */
  redis:
    CACHE_CONFIG.strategy === 'redis'
      ? {
          host: REDIS_CONFIG.host,
          port: REDIS_CONFIG.port,
          password: REDIS_CONFIG.password,
        }
      : undefined,

  /**
   * AWS backing services (`JOBS_PROVIDER=aws`). SQS carries one-off jobs;
   * recurring schedules are EventBridge rules owned by infrastructure, so the
   * application registers handlers but never creates a schedule.
   */
  aws: {
    region: env.JOBS_AWS_REGION,
    queueUrl: env.JOBS_AWS_QUEUE_URL,
    endpoint: env.JOBS_AWS_ENDPOINT || undefined,
    accessKeyId: env.JOBS_AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: env.JOBS_AWS_SECRET_ACCESS_KEY || undefined,
  },

  /** Job-specific settings */
  dataRetention: {
    /** Cron pattern for data retention cleanup */
    schedule: env.JOBS_DATA_RETENTION_SCHEDULE,
    /** Enable data retention cleanup job */
    enabled: env.JOBS_DATA_RETENTION_ENABLED,
  },

  /** System (platform) signing key rotation */
  systemSigningKeyRotation: {
    /** Cron pattern (e.g. '0 0 1 * *' = monthly, first day at midnight) */
    schedule: env.JOBS_SYSTEM_SIGNING_KEY_ROTATION_SCHEDULE,
    /** Enable automatic system signing key rotation */
    enabled: env.JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED,
  },

  /** Domain-event relay (transactional outbox -> consumers) */
  eventRelay: {
    /** Enable the relay + sweep jobs */
    enabled: env.JOBS_EVENT_RELAY_ENABLED,
    /** Cron pattern for the durability sweep (default: every minute) */
    sweepSchedule: env.JOBS_EVENT_RELAY_SWEEP_SCHEDULE,
    /** Max pending events claimed per transaction/batch */
    batchSize: env.JOBS_EVENT_RELAY_BATCH_SIZE,
    /** Max batches processed per relay/sweep run before yielding */
    maxBatches: env.JOBS_EVENT_RELAY_MAX_BATCHES,
  },

  /** Webhook delivery job (signs + POSTs queued delivery attempts) */
  webhookDelivery: {
    /** Enable the webhook delivery job */
    enabled: env.JOBS_WEBHOOK_DELIVERY_ENABLED,
    /** Cron pattern for the delivery sweep (default: every minute) */
    schedule: env.JOBS_WEBHOOK_DELIVERY_SCHEDULE,
    /** Max due deliveries claimed per batch */
    batchSize: env.JOBS_WEBHOOK_DELIVERY_BATCH_SIZE,
    /** Max batches processed per run before yielding */
    maxBatches: env.JOBS_WEBHOOK_DELIVERY_MAX_BATCHES,
  },

  /** Notification email delivery job (sends pending email-channel notifications) */
  notificationDelivery: {
    /** Enable the notification email delivery job */
    enabled: env.JOBS_NOTIFICATION_DELIVERY_ENABLED,
    /** Cron pattern for the delivery sweep (default: every minute) */
    schedule: env.JOBS_NOTIFICATION_DELIVERY_SCHEDULE,
    /** Max due notifications claimed per batch */
    batchSize: env.JOBS_NOTIFICATION_DELIVERY_BATCH_SIZE,
    /** Max batches processed per run before yielding */
    maxBatches: env.JOBS_NOTIFICATION_DELIVERY_MAX_BATCHES,
  },

  /** BullMQ default job options */
  bullmq: {
    /** Number of retry attempts for failed jobs */
    attempts: env.JOBS_BULLMQ_ATTEMPTS,

    /** Backoff configuration for retries */
    backoff: {
      /** Backoff type: 'exponential' | 'fixed' */
      type: env.JOBS_BULLMQ_BACKOFF_TYPE,
      /** Delay in milliseconds before retry */
      delay: env.JOBS_BULLMQ_BACKOFF_DELAY,
    },

    /** Completed job retention (in seconds) */
    removeOnComplete: {
      /** Age in seconds to keep completed jobs (default: 7 days) */
      age: env.JOBS_BULLMQ_REMOVE_ON_COMPLETE_AGE,
    },

    /** Failed job retention (in seconds) */
    removeOnFail: {
      /** Age in seconds to keep failed jobs (default: 30 days) */
      age: env.JOBS_BULLMQ_REMOVE_ON_FAIL_AGE,
    },
  },
} as const;

// ============================================================================
// Webhooks Configuration
// ============================================================================

function parseCsvList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const WEBHOOK_CONFIG = {
  /** Per-delivery HTTP timeout (ms). */
  deliveryTimeoutMs: env.WEBHOOKS_DELIVERY_TIMEOUT_MS,

  /** SSRF guard settings for outbound delivery + create-time validation. */
  ssrf: {
    /** Allowed URL protocols (https only unless HTTP is explicitly enabled). */
    allowedProtocols: env.WEBHOOKS_ALLOW_HTTP ? ['http:', 'https:'] : ['https:'],
    /** Allow private/loopback targets (dev/test only). */
    allowPrivateTargets: env.WEBHOOKS_SSRF_ALLOW_PRIVATE,
    /** Hostnames that bypass SSRF checks. */
    allowlist: parseCsvList(env.WEBHOOKS_SSRF_ALLOWLIST),
    /** Hostnames that are always rejected. */
    denylist: parseCsvList(env.WEBHOOKS_SSRF_DENYLIST),
  },

  /** Signing timestamp tolerance advertised to consumers (seconds). */
  signatureTimestampToleranceSeconds: env.WEBHOOKS_SIGNATURE_TIMESTAMP_TOLERANCE_SECONDS,

  /** Random bytes used to generate subscription signing secrets. */
  secretBytes: env.WEBHOOKS_SECRET_BYTES,

  /** App-level retry policy for failed deliveries. */
  retry: {
    maxAttempts: env.WEBHOOKS_RETRY_MAX_ATTEMPTS,
    baseDelaySeconds: env.WEBHOOKS_RETRY_BASE_DELAY_SECONDS,
    maxDelaySeconds: env.WEBHOOKS_RETRY_MAX_DELAY_SECONDS,
    horizonHours: env.WEBHOOKS_RETRY_HORIZON_HOURS,
  },
} as const;

// ============================================================================
// Notifications Configuration
// ============================================================================

const NOTIFICATION_CONFIG = {
  /** App-level retry policy for the email notification channel. */
  emailRetry: {
    maxAttempts: env.NOTIFICATIONS_EMAIL_RETRY_MAX_ATTEMPTS,
    baseDelaySeconds: env.NOTIFICATIONS_EMAIL_RETRY_BASE_DELAY_SECONDS,
    maxDelaySeconds: env.NOTIFICATIONS_EMAIL_RETRY_MAX_DELAY_SECONDS,
    horizonHours: env.NOTIFICATIONS_EMAIL_RETRY_HORIZON_HOURS,
  },
} as const;

// ============================================================================
// Demo Mode Configuration
// ============================================================================

const DEMO_MODE_CONFIG = {
  /** Enable demo mode for limited-usage deployments */
  enabled: env.DEMO_MODE_ENABLED,

  /**
   * Cron schedule for automatic demo database refresh.
   * Default: every 2 days at midnight.
   */
  dbRefreshSchedule: env.DEMO_MODE_DB_REFRESH_SCHEDULE,
} as const;

// ============================================================================
// System Constants
// ============================================================================

const SYSTEM_CONSTANTS = {
  /** System user ID for internal operations (configurable via SYSTEM_USER_ID env var) */
  systemUserId: env.SYSTEM_USER_ID,

  /**
   * Default page size for pagination. 50 matches the long-standing behaviour of
   * `EntityRepository` and the REST query schema; both now read this value.
   */
  defaultPageSize: env.PAGINATION_DEFAULT_PAGE_SIZE,

  /** Maximum page size for pagination */
  maxPageSize: env.PAGINATION_MAX_PAGE_SIZE,
} as const;

// ============================================================================
// CDM Document Limits
// ============================================================================

/**
 * Bounds for the `JSON` scalar fields of a CDM sync document. GraphQL types the
 * rest of `SyncProjectInput` but asserts nothing about a `JSON` scalar, and the
 * document is persisted whole into the job row and replayed on every retry.
 */
const CDM_CONFIG = {
  /** Maximum serialized size of a single `metadata` / `condition` / `searchable` value. */
  maxJsonBytes: env.CDM_MAX_JSON_BYTES,

  /** Maximum nesting depth of a single `JSON` scalar value. */
  maxJsonDepth: env.CDM_MAX_JSON_DEPTH,
} as const;

// ============================================================================
// Validation & Export
// ============================================================================

/**
 * Validate critical configuration values
 * Throws an error if any required values are missing or invalid
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate database URL
  if (!DB_CONFIG.url || DB_CONFIG.url.length === 0) {
    errors.push('DB_URL is required');
  }

  // Validate Redis config when using Redis cache
  if (CACHE_CONFIG.strategy === 'redis') {
    if (!REDIS_CONFIG.host) {
      errors.push('REDIS_HOST is required when CACHE_STRATEGY=redis');
    }
  }

  // Validate frontend URL in production
  if (APP_CONFIG.isProduction && !SECURITY_CONFIG.frontendUrl) {
    errors.push('SECURITY_FRONTEND_URL must be set in production');
  }

  // Validate email configuration
  if (EMAIL_CONFIG.provider !== 'console') {
    if (!EMAIL_CONFIG.from) {
      errors.push('EMAIL_FROM is required when not using console provider');
    }

    switch (EMAIL_CONFIG.provider) {
      case 'mailgun':
        if (!EMAIL_CONFIG.mailgun.apiKey || !EMAIL_CONFIG.mailgun.domain) {
          errors.push(
            'MAILGUN_API_KEY and MAILGUN_DOMAIN are required when using mailgun provider'
          );
        }
        break;
      case 'mailjet':
        if (!EMAIL_CONFIG.mailjet.apiKey || !EMAIL_CONFIG.mailjet.secretKey) {
          errors.push(
            'MAILJET_API_KEY and MAILJET_SECRET_KEY are required when using mailjet provider'
          );
        }
        break;
      case 'ses':
        // Credentials are deliberately not required. Left unset the SDK's default
        // credential chain applies and an execution or task role signs — the expected
        // production path on AWS, where a static key in an environment variable is
        // what you are trying to avoid. Same reasoning as the S3 provider above.
        break;
      case 'smtp':
        if (!EMAIL_CONFIG.smtp.host || !EMAIL_CONFIG.smtp.user || !EMAIL_CONFIG.smtp.password) {
          errors.push(
            'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required when using smtp provider'
          );
        }
        break;
    }
  }

  // Validate storage configuration
  if (STORAGE_CONFIG.provider === 's3') {
    if (!STORAGE_CONFIG.s3.bucket) {
      errors.push('STORAGE_S3_BUCKET is required when using s3 provider');
    }
    // Credentials are deliberately not required. Left unset, the SDK's default
    // credential chain applies and a Lambda or task role supplies them — which is the
    // expected production path on the AWS target, where static keys would be a
    // long-lived secret to store and rotate for no benefit. CACHE_DYNAMODB_* and
    // JOBS_AWS_* have always worked this way; S3 requiring them was the outlier, and
    // it blocked the AWS target outright (ADR 0004, Correction 2026-08-30).
  }

  // Validate GitHub OAuth configuration (optional, but warn if partially configured)
  if (GITHUB_OAUTH_CONFIG.clientId || GITHUB_OAUTH_CONFIG.clientSecret) {
    if (!GITHUB_OAUTH_CONFIG.clientId) {
      errors.push('GITHUB_CLIENT_ID is required when GITHUB_CLIENT_SECRET is set');
    }
    // The secret is deliberately not required here. `GithubOAuthService` reads it
    // through `ISecretResolver` (ADR 0004), so on a target that keeps it in a secret
    // store it is legitimately absent from the environment — and demanding an env copy
    // defeats the point of moving it. Requiring it forced a placeholder string into the
    // Lambda environment on the first real deploy, which is the smell that found this.
    //
    // The reverse check above stays: a secret with no client ID is unusable either way.
  }

  if (errors.length > 0) {
    throw new ConfigurationError(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Print configuration summary (safe for logging - no secrets)
 */
export async function printConfigSummary(): Promise<void> {
  // Dynamic import to avoid circular dependency with logger
  const { logger } = await import('@/lib/logger');

  logger.info({
    msg: '📋 Configuration Summary',
    environment: APP_CONFIG.nodeEnv,
    port: APP_CONFIG.port,
    cacheStrategy: CACHE_CONFIG.strategy,
    database: DB_CONFIG.url.split('@')[1] || 'configured',
    jwtExpiration: `${JWT_CONFIG.accessTokenExpirationMinutes}min / ${JWT_CONFIG.refreshTokenExpirationDays}d`,
    emailProvider: EMAIL_CONFIG.provider,
    ...(CACHE_CONFIG.strategy === 'redis' && {
      redis: `${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`,
    }),
  });
}

// ============================================================================
// Middleware Configuration (Computed from other configs)
// ============================================================================

function isValidOrigin(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Development CORS origins (comma-separated, env-overridable, validated) */
const DEV_CORS_ORIGINS: string[] = env.CORS_DEV_ORIGINS.split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)
  .filter(isValidOrigin);

/** Validated additional origins from SECURITY_CONFIG */
const ADDITIONAL_ORIGINS: string[] = SECURITY_CONFIG.additionalOrigins.filter(isValidOrigin);

/** CORS configuration for Express middleware */
const CORS_CONFIG = {
  origin: APP_CONFIG.isProduction
    ? [SECURITY_CONFIG.frontendUrl, ...ADDITIONAL_ORIGINS].filter(isValidOrigin)
    : [...DEV_CORS_ORIGINS, ...ADDITIONAL_ORIGINS],
  credentials: true,
} as const;

/** Apollo Sandbox CDN origins (required when CSP is enabled and playground is used) */
const APOLLO_SANDBOX_CDN = [
  'https://embeddable-sandbox.cdn.apollographql.com',
  'https://apollo-server-landing-page.cdn.apollographql.com',
  'https://sandbox.embed.apollographql.com',
] as const;

/** Helmet security headers configuration */
const HELMET_CONFIG = {
  crossOriginEmbedderPolicy: APOLLO_CONFIG.playground ? false : undefined,
  contentSecurityPolicy: (():
    false | undefined | { useDefaults: false; directives: Record<string, string[]> } => {
    if (!APP_CONFIG.isProduction) return false;
    if (!APOLLO_CONFIG.playground) return undefined;
    const cdnList = [...APOLLO_SANDBOX_CDN];
    return {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'", ...cdnList],
        scriptSrc: ["'self'", "'unsafe-inline'", ...cdnList],
        scriptSrcElem: ["'self'", "'unsafe-inline'", ...cdnList],
        imgSrc: ["'self'", 'data:', ...cdnList],
        styleSrc: ["'self'", "'unsafe-inline'", ...cdnList],
        manifestSrc: ["'self'", ...cdnList],
        frameSrc: ["'self'", ...cdnList],
        connectSrc: ["'self'"],
      },
    };
  })(),
} as const;

/** Swagger UI setup configuration (computed from SWAGGER_CONFIG) */
const SWAGGER_UI_SETUP_CONFIG = {
  customSiteTitle: SWAGGER_CONFIG.siteTitle,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: SWAGGER_CONFIG.persistAuthorization,
    displayRequestDuration: SWAGGER_CONFIG.displayRequestDuration,
    filter: SWAGGER_CONFIG.filter,
    tryItOutEnabled: SWAGGER_CONFIG.tryItOutEnabled,
    defaultModelsExpandDepth: SWAGGER_CONFIG.modelsExpandDepth,
    defaultModelExpandDepth: SWAGGER_CONFIG.modelExpandDepth,
    docExpansion: SWAGGER_CONFIG.docExpansion,
    deepLinking: SWAGGER_CONFIG.deepLinking,
    displayOperationId: SWAGGER_CONFIG.displayOperationId,
    syntaxHighlight: {
      activate: true,
      theme: SWAGGER_CONFIG.syntaxTheme,
    },
    showExtensions: SWAGGER_CONFIG.showExtensions,
    showCommonExtensions: SWAGGER_CONFIG.showCommonExtensions,
  },
} as const;

// ============================================================================
// Unified Configuration Export
// ============================================================================

// Export all configurations as a single object
export const config = {
  app: APP_CONFIG,
  db: DB_CONFIG,
  jwt: JWT_CONFIG,
  auth: AUTH_CONFIG,
  token: TOKEN_CONFIG,
  githubOAuth: GITHUB_OAUTH_CONFIG,
  projectOAuth: PROJECT_OAUTH_CONFIG,
  cache: CACHE_CONFIG,
  redis: REDIS_CONFIG,
  secrets: SECRETS_CONFIG,
  security: SECURITY_CONFIG,
  apollo: APOLLO_CONFIG,
  swagger: SWAGGER_CONFIG,
  swaggerSetup: SWAGGER_UI_SETUP_CONFIG,
  email: EMAIL_CONFIG,
  i18n: I18N_CONFIG,
  logging: LOGGING_CONFIG,
  metrics: METRICS_CONFIG,
  telemetry: TELEMETRY_CONFIG,
  analytics: ANALYTICS_CONFIG,
  tracing: TRACING_CONFIG,
  storage: STORAGE_CONFIG,
  privacy: PRIVACY_CONFIG,
  jobs: JOB_CONFIG,
  webhooks: WEBHOOK_CONFIG,
  notifications: NOTIFICATION_CONFIG,
  demoMode: DEMO_MODE_CONFIG,
  system: SYSTEM_CONSTANTS,
  cdm: CDM_CONFIG,
  cors: CORS_CONFIG,
  helmet: HELMET_CONFIG,
} as const;
