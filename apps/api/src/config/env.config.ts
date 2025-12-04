/**
 * Environment Configuration Module
 *
 * This module provides centralized, type-safe access to all environment variables.
 *
 * Naming Conventions:
 * - APP_* - Application-level settings (port, environment, etc.)
 * - DB_* - Database configuration
 * - JWT_* - JWT and authentication settings
 * - AUTH_* - Authentication and authorization settings
 * - CACHE_* - Cache strategy and settings
 * - REDIS_* - Redis-specific configuration
 * - SECURITY_* - Security-related settings
 * - NODE_ENV - Standard Node.js environment variable (no prefix)
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@logusgraphics/grant-constants';
import * as dotenv from 'dotenv';

import { BadRequestError } from '@/lib/errors';

// Load environment variables from .env file
dotenv.config();

/**
 * Get environment variable with type conversion and validation
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new BadRequestError(`Missing required environment variable: ${key}`);
  }
  return value ?? defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new BadRequestError(
      `Environment variable ${key} must be a valid number`,
      'errors:validation.invalid',
      { field: key }
    );
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvEnum<T extends string>(
  key: string,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  const value = (process.env[key] as T) ?? defaultValue;
  if (!allowedValues.includes(value)) {
    throw new BadRequestError(
      `Environment variable ${key} must be one of [${allowedValues.join(', ')}], got: ${value}`
    );
  }
  return value;
}

// ============================================================================
// Application Configuration
// ============================================================================

export const APP_CONFIG = {
  /** Application name */
  name: 'Grant Platform API',

  /** Application version */
  version: '1.0.0',

  /** Server port */
  port: getEnvNumber('APP_PORT', 4000),

  /** Node environment */
  nodeEnv: getEnvEnum('NODE_ENV', ['development', 'production', 'test'] as const, 'development'),

  /** Whether the app is running in production */
  isProduction: getEnv('NODE_ENV', 'development') === 'production',

  /** Whether the app is running in development */
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',

  /** Whether the app is running in test mode */
  isTest: getEnv('NODE_ENV', 'development') === 'test',
} as const;

// ============================================================================
// Database Configuration
// ============================================================================

export const DB_CONFIG = {
  /** PostgreSQL connection string */
  url: getEnv('DB_URL', 'postgresql://grant_user:grant_password@localhost:5432/grant_platform'),

  /** Maximum number of connections in the pool */
  poolMax: getEnvNumber('DB_POOL_MAX', 20),

  /** Minimum number of connections in the pool */
  poolMin: getEnvNumber('DB_POOL_MIN', 2),

  /** Connection timeout in seconds */
  connectionTimeout: getEnvNumber('DB_CONNECTION_TIMEOUT', 30),

  /** Idle timeout in seconds - how long a connection can be idle before being closed */
  idleTimeout: getEnvNumber('DB_IDLE_TIMEOUT', 20),

  /** Query timeout in milliseconds */
  queryTimeout: getEnvNumber('DB_QUERY_TIMEOUT', 60000),

  /** Enable query logging */
  logQueries: getEnvBoolean('DB_LOG_QUERIES', !APP_CONFIG.isProduction),
} as const;

// ============================================================================
// JWT Configuration
// ============================================================================

export const JWT_CONFIG = {
  /** JWT secret key for signing tokens */
  secret: getEnv('JWT_SECRET', 'your-secret-key-change-in-production'),

  /** Access token expiration in minutes */
  accessTokenExpirationMinutes: getEnvNumber('JWT_ACCESS_TOKEN_EXPIRATION_MINUTES', 15),

  /** Refresh token expiration in days */
  refreshTokenExpirationDays: getEnvNumber('JWT_REFRESH_TOKEN_EXPIRATION_DAYS', 30),

  /** JWT algorithm */
  algorithm: 'HS256' as const,

  /** JWT issuer */
  issuer: 'grant-platform',
} as const;

// ============================================================================
// Authentication Configuration
// ============================================================================

export const AUTH_CONFIG = {
  /** Provider verification token expiration in days */
  providerVerificationExpirationDays: getEnvNumber('AUTH_PROVIDER_VERIFICATION_EXPIRATION_DAYS', 7),

  /** OTP (One-Time Password) validity in minutes */
  otpValidityMinutes: getEnvNumber('AUTH_OTP_VALIDITY_MINUTES', 5),

  /** Password reset OTP validity in minutes */
  passwordResetOtpValidityMinutes: getEnvNumber('AUTH_PASSWORD_RESET_OTP_VALIDITY_MINUTES', 60),

  /** Maximum number of failed login attempts before lockout */
  maxFailedLoginAttempts: getEnvNumber('AUTH_MAX_FAILED_LOGIN_ATTEMPTS', 5),

  /** Account lockout duration in minutes */
  lockoutDurationMinutes: getEnvNumber('AUTH_LOCKOUT_DURATION_MINUTES', 15),
} as const;

// ============================================================================
// GitHub OAuth Configuration
// ============================================================================

export const GITHUB_OAUTH_CONFIG = {
  /** GitHub OAuth Client ID */
  clientId: getEnv('GITHUB_CLIENT_ID', ''),

  /** GitHub OAuth Client Secret */
  clientSecret: getEnv('GITHUB_CLIENT_SECRET', ''),

  /** GitHub OAuth callback URL */
  callbackUrl: getEnv('GITHUB_CALLBACK_URL', 'http://localhost:4000/api/auth/github/callback'),

  /** GitHub OAuth authorization URL */
  authorizationUrl: 'https://github.com/login/oauth/authorize',

  /** GitHub OAuth token URL */
  tokenUrl: 'https://github.com/login/oauth/access_token',

  /** GitHub API base URL */
  apiUrl: 'https://api.github.com',

  /** OAuth scopes to request */
  scopes: ['user:email', 'read:user'],

  /** State token validity in minutes (for CSRF protection) */
  stateValidityMinutes: getEnvNumber('GITHUB_OAUTH_STATE_VALIDITY_MINUTES', 10),
} as const;

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_CONFIG = {
  /** Cache strategy: 'memory' for single instance, 'redis' for distributed */
  strategy: getEnvEnum('CACHE_STRATEGY', ['memory', 'redis'] as const, 'memory'),

  /** Default TTL (Time To Live) in seconds */
  defaultTtl: getEnvNumber('CACHE_DEFAULT_TTL', 3600),

  /** Maximum cache size in bytes (for in-memory cache) */
  maxSize: getEnvNumber('CACHE_MAX_SIZE', 100 * 1024 * 1024), // 100MB
} as const;

// ============================================================================
// Redis Configuration
// ============================================================================

export const REDIS_CONFIG = {
  /** Redis server hostname */
  host: getEnv('REDIS_HOST', 'localhost'),

  /** Redis server port */
  port: getEnvNumber('REDIS_PORT', 6379),

  /** Redis authentication password */
  password: process.env.REDIS_PASSWORD || undefined,

  /** Redis database number */
  database: getEnvNumber('REDIS_DB', 0),

  /** Redis key prefix for namespacing */
  keyPrefix: getEnv('REDIS_KEY_PREFIX', 'grant:'),

  /** Connection timeout in milliseconds */
  connectionTimeout: getEnvNumber('REDIS_CONNECTION_TIMEOUT', 10000),

  /** Enable TLS for Redis connection */
  enableTls: getEnvBoolean('REDIS_ENABLE_TLS', false),
} as const;

// ============================================================================
// Security Configuration
// ============================================================================

export const SECURITY_CONFIG = {
  /** Frontend URL for CORS */
  frontendUrl: getEnv('SECURITY_FRONTEND_URL', 'http://localhost:3000'),

  /** Additional allowed origins for CORS (comma-separated) */
  additionalOrigins: process.env.SECURITY_ADDITIONAL_ORIGINS
    ? process.env.SECURITY_ADDITIONAL_ORIGINS.split(',').map((o) => o.trim())
    : [],

  /** Enable CSRF protection */
  enableCsrf: getEnvBoolean('SECURITY_ENABLE_CSRF', APP_CONFIG.isProduction),

  /** Enable Helmet security headers */
  enableHelmet: getEnvBoolean('SECURITY_ENABLE_HELMET', true),

  /** Enable rate limiting */
  enableRateLimit: getEnvBoolean('SECURITY_ENABLE_RATE_LIMIT', APP_CONFIG.isProduction),

  /** Rate limit: maximum requests per window */
  rateLimitMax: getEnvNumber('SECURITY_RATE_LIMIT_MAX', 100),

  /** Rate limit: time window in minutes */
  rateLimitWindowMinutes: getEnvNumber('SECURITY_RATE_LIMIT_WINDOW_MINUTES', 15),

  /** API Key for external service authentication (optional) */
  apiKey: process.env.SECURITY_API_KEY || undefined,
} as const;

// ============================================================================
// Apollo/GraphQL Configuration
// ============================================================================

export const APOLLO_CONFIG = {
  /** Enable GraphQL introspection */
  introspection: getEnvBoolean('APOLLO_INTROSPECTION', !APP_CONFIG.isProduction),

  /** Enable CSRF prevention */
  csrfPrevention: getEnvBoolean('APOLLO_CSRF_PREVENTION', APP_CONFIG.isProduction),

  /** Enable GraphQL playground */
  playground: getEnvBoolean('APOLLO_PLAYGROUND', APP_CONFIG.isDevelopment),

  /** Include stack traces in errors */
  includeStacktrace: getEnvBoolean('APOLLO_INCLUDE_STACKTRACE', APP_CONFIG.isDevelopment),
} as const;

// ============================================================================
// Swagger/OpenAPI Configuration
// ============================================================================

export const SWAGGER_CONFIG = {
  /** Enable Swagger UI documentation */
  enabled: getEnvBoolean('SWAGGER_ENABLED', true),

  /** Custom site title for Swagger UI */
  siteTitle: getEnv('SWAGGER_SITE_TITLE', 'Grant Platform API Docs'),

  /** Persist authorization between page refreshes */
  persistAuthorization: getEnvBoolean('SWAGGER_PERSIST_AUTHORIZATION', true),

  /** Display request duration in responses */
  displayRequestDuration: getEnvBoolean('SWAGGER_DISPLAY_REQUEST_DURATION', true),

  /** Enable filter/search in operations */
  filter: getEnvBoolean('SWAGGER_FILTER', true),

  /** Enable "Try it out" by default */
  tryItOutEnabled: getEnvBoolean('SWAGGER_TRY_IT_OUT_ENABLED', true),

  /** Depth to expand models/schemas */
  modelsExpandDepth: getEnvNumber('SWAGGER_MODELS_EXPAND_DEPTH', 3),

  /** Depth to expand individual model properties */
  modelExpandDepth: getEnvNumber('SWAGGER_MODEL_EXPAND_DEPTH', 3),

  /** Documentation expansion: 'list' | 'full' | 'none' */
  docExpansion: getEnvEnum('SWAGGER_DOC_EXPANSION', ['list', 'full', 'none'] as const, 'list'),

  /** Enable deep linking for sharing */
  deepLinking: getEnvBoolean('SWAGGER_DEEP_LINKING', true),

  /** Display operation IDs */
  displayOperationId: getEnvBoolean('SWAGGER_DISPLAY_OPERATION_ID', false),

  /** Syntax highlighting theme: 'agate' | 'arta' | 'monokai' | 'nord' | 'obsidian' | 'tomorrow-night' */
  syntaxTheme: getEnvEnum(
    'SWAGGER_SYNTAX_THEME',
    ['agate', 'arta', 'monokai', 'nord', 'obsidian', 'tomorrow-night'] as const,
    'monokai'
  ),

  /** Show extensions */
  showExtensions: getEnvBoolean('SWAGGER_SHOW_EXTENSIONS', true),

  /** Show common extensions */
  showCommonExtensions: getEnvBoolean('SWAGGER_SHOW_COMMON_EXTENSIONS', true),
} as const;

// ============================================================================
// i18n Configuration
// ============================================================================

export const I18N_CONFIG = {
  /** Supported locales */
  supportedLocales: SUPPORTED_LOCALES,

  /** Default locale */
  defaultLocale: getEnvEnum('I18N_DEFAULT_LOCALE', SUPPORTED_LOCALES, DEFAULT_LOCALE),

  /** Enable i18n debug mode */
  debug: getEnvBoolean('I18N_DEBUG', APP_CONFIG.isDevelopment),
} as const;

// ============================================================================
// Email Configuration
// ============================================================================

export const EMAIL_CONFIG = {
  /** Email provider */
  provider: getEnvEnum(
    'EMAIL_PROVIDER',
    ['console', 'mailgun', 'mailjet', 'smtp'] as const,
    'console'
  ),

  /** From email address */
  from: getEnv('EMAIL_FROM', 'noreply@yourdomain.com'),

  /** From name displayed in emails */
  fromName: process.env.EMAIL_FROM_NAME || 'Grant Platform',

  /** Mailgun configuration */
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
  },

  /** Mailjet configuration */
  mailjet: {
    apiKey: process.env.MAILJET_API_KEY || '',
    secretKey: process.env.MAILJET_SECRET_KEY || '',
  },

  /** SMTP configuration */
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: getEnvNumber('SMTP_PORT', 587),
    secure: getEnvBoolean('SMTP_SECURE', false),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
} as const;

// ============================================================================
// Logging Configuration
// ============================================================================

export const LOGGING_CONFIG = {
  /** Log level: trace, debug, info, warn, error, fatal */
  level: getEnvEnum(
    'LOG_LEVEL',
    ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const,
    APP_CONFIG.isProduction ? 'info' : 'debug'
  ),

  /** Pretty print logs (development only) */
  prettyPrint: getEnvBoolean('LOG_PRETTY_PRINT', APP_CONFIG.isDevelopment),
} as const;

// ============================================================================
// File Storage Configuration
// ============================================================================

export const STORAGE_CONFIG = {
  /** Storage provider: 'local' | 's3' */
  provider: getEnvEnum('STORAGE_PROVIDER', ['local', 's3'] as const, 'local'),

  /** Local storage configuration (works for bare metal, Docker volumes, or any filesystem mount) */
  local: {
    /** Base path for local file storage (can be local directory, Docker volume mount, etc.) */
    basePath: getEnv('STORAGE_LOCAL_BASE_PATH', './storage'),
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
    bucket: getEnv('STORAGE_S3_BUCKET', ''),
    /** AWS region */
    region: getEnv('STORAGE_S3_REGION', 'us-east-1'),
    /** AWS access key ID */
    accessKeyId: getEnv('STORAGE_S3_ACCESS_KEY_ID', ''),
    /** AWS secret access key */
    secretAccessKey: getEnv('STORAGE_S3_SECRET_ACCESS_KEY', ''),
    /** Custom S3 endpoint (for S3-compatible services like MinIO) */
    endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
    /** Public URL base (e.g., CloudFront distribution URL) */
    publicUrl: process.env.STORAGE_S3_PUBLIC_URL || undefined,
  },

  /** File upload validation configuration */
  upload: {
    /** Maximum file size in bytes (default: 5MB) */
    maxFileSize: getEnvNumber('STORAGE_UPLOAD_MAX_FILE_SIZE', 5 * 1024 * 1024),
    /** Allowed MIME types for file uploads */
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
    /** Allowed file extensions */
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const,
  },
} as const;

// ============================================================================
// Privacy & Data Retention Configuration
// ============================================================================

export const PRIVACY_CONFIG = {
  /** Data retention period in days for deleted accounts (default: 30) */
  accountDeletionRetentionDays: getEnvNumber('PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS', 30),

  /** Data retention period in days for backups (default: 90) */
  backupRetentionDays: getEnvNumber('PRIVACY_BACKUP_RETENTION_DAYS', 90),
} as const;

// ============================================================================
// Job Scheduling Configuration
// ============================================================================

export const JOB_CONFIG = {
  /** Enable job scheduling */
  enabled: getEnvBoolean('JOBS_ENABLED', true),

  /** Job scheduling provider: 'node-cron' | 'bullmq' */
  provider: getEnvEnum('JOBS_PROVIDER', ['node-cron', 'bullmq'] as const, 'node-cron'),

  /** Redis connection for BullMQ (uses existing Redis config if available) */
  redis:
    CACHE_CONFIG.strategy === 'redis'
      ? {
          host: REDIS_CONFIG.host,
          port: REDIS_CONFIG.port,
          password: REDIS_CONFIG.password,
        }
      : undefined,

  /** Job-specific settings */
  dataRetention: {
    /** Cron pattern for data retention cleanup */
    schedule: getEnv('JOBS_DATA_RETENTION_SCHEDULE', '0 2 * * *'),
    /** Enable data retention cleanup job */
    enabled: getEnvBoolean('JOBS_DATA_RETENTION_ENABLED', true),
  },

  /** BullMQ default job options */
  bullmq: {
    /** Number of retry attempts for failed jobs */
    attempts: getEnvNumber('JOBS_BULLMQ_ATTEMPTS', 3),

    /** Backoff configuration for retries */
    backoff: {
      /** Backoff type: 'exponential' | 'fixed' */
      type: getEnvEnum(
        'JOBS_BULLMQ_BACKOFF_TYPE',
        ['exponential', 'fixed'] as const,
        'exponential'
      ),
      /** Delay in milliseconds before retry */
      delay: getEnvNumber('JOBS_BULLMQ_BACKOFF_DELAY', 2000),
    },

    /** Completed job retention (in seconds) */
    removeOnComplete: {
      /** Age in seconds to keep completed jobs (default: 7 days) */
      age: getEnvNumber('JOBS_BULLMQ_REMOVE_ON_COMPLETE_AGE', 7 * 24 * 3600),
    },

    /** Failed job retention (in seconds) */
    removeOnFail: {
      /** Age in seconds to keep failed jobs (default: 30 days) */
      age: getEnvNumber('JOBS_BULLMQ_REMOVE_ON_FAIL_AGE', 30 * 24 * 3600),
    },
  },
} as const;

// ============================================================================
// System Constants
// ============================================================================

export const SYSTEM_CONSTANTS = {
  /** System user ID for internal operations (configurable via SYSTEM_USER_ID env var) */
  systemUserId: getEnv('SYSTEM_USER_ID', '00000000-0000-0000-0000-000000000000'),

  /** Default page size for pagination */
  defaultPageSize: 20,

  /** Maximum page size for pagination */
  maxPageSize: 100,
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

  // Validate JWT secret in production
  if (APP_CONFIG.isProduction && JWT_CONFIG.secret === 'your-secret-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }

  // Validate database URL
  if (!DB_CONFIG.url || DB_CONFIG.url.length === 0) {
    errors.push('DB_URL is required');
  }

  // Validate Redis config when using Redis cache
  if (CACHE_CONFIG.strategy === 'redis') {
    if (!REDIS_CONFIG.host) {
      errors.push('REDIS_HOST is required when CACHE_STRATEGY=redis');
    }
    if (APP_CONFIG.isProduction && !REDIS_CONFIG.password) {
      errors.push('REDIS_PASSWORD is recommended in production when using Redis');
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
    if (!STORAGE_CONFIG.s3.accessKeyId) {
      errors.push('STORAGE_S3_ACCESS_KEY_ID is required when using s3 provider');
    }
    if (!STORAGE_CONFIG.s3.secretAccessKey) {
      errors.push('STORAGE_S3_SECRET_ACCESS_KEY is required when using s3 provider');
    }
  }

  // Validate GitHub OAuth configuration (optional, but warn if partially configured)
  if (GITHUB_OAUTH_CONFIG.clientId || GITHUB_OAUTH_CONFIG.clientSecret) {
    if (!GITHUB_OAUTH_CONFIG.clientId) {
      errors.push('GITHUB_CLIENT_ID is required when GITHUB_CLIENT_SECRET is set');
    }
    if (!GITHUB_OAUTH_CONFIG.clientSecret) {
      errors.push('GITHUB_CLIENT_SECRET is required when GITHUB_CLIENT_ID is set');
    }
  }

  if (errors.length > 0) {
    throw new BadRequestError(
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

/** CORS configuration for Express middleware */
const CORS_CONFIG = {
  origin: APP_CONFIG.isProduction
    ? SECURITY_CONFIG.frontendUrl
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://studio.apollographql.com',
        'https://apollo-studio-embed.vercel.app',
        ...SECURITY_CONFIG.additionalOrigins,
      ],
  credentials: true,
} as const;

/** Helmet security headers configuration */
const HELMET_CONFIG = {
  contentSecurityPolicy: APP_CONFIG.isProduction ? undefined : false,
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
  githubOAuth: GITHUB_OAUTH_CONFIG,
  cache: CACHE_CONFIG,
  redis: REDIS_CONFIG,
  security: SECURITY_CONFIG,
  apollo: APOLLO_CONFIG,
  swagger: SWAGGER_CONFIG,
  swaggerSetup: SWAGGER_UI_SETUP_CONFIG,
  email: EMAIL_CONFIG,
  i18n: I18N_CONFIG,
  logging: LOGGING_CONFIG,
  storage: STORAGE_CONFIG,
  privacy: PRIVACY_CONFIG,
  jobs: JOB_CONFIG,
  system: SYSTEM_CONSTANTS,
  cors: CORS_CONFIG,
  helmet: HELMET_CONFIG,
} as const;

// Export type for TypeScript consumers
export type Config = typeof config;
