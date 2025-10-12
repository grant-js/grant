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

import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Get environment variable with type conversion and validation
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
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
    throw new Error(
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

  /** Connection timeout in milliseconds */
  connectionTimeout: getEnvNumber('DB_CONNECTION_TIMEOUT', 30000),

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

  /** Maximum number of failed login attempts before lockout */
  maxFailedLoginAttempts: getEnvNumber('AUTH_MAX_FAILED_LOGIN_ATTEMPTS', 5),

  /** Account lockout duration in minutes */
  lockoutDurationMinutes: getEnvNumber('AUTH_LOCKOUT_DURATION_MINUTES', 15),
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
// System Constants (Not Configurable via ENV)
// ============================================================================

export const SYSTEM_CONSTANTS = {
  /** System user ID for internal operations */
  systemUserId: '00000000-0000-0000-0000-000000000000',

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

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Print configuration summary (safe for logging - no secrets)
 */
export function printConfigSummary(): void {
  console.log('📋 Configuration Summary:');
  console.log(`   Environment: ${APP_CONFIG.nodeEnv}`);
  console.log(`   Port: ${APP_CONFIG.port}`);
  console.log(`   Cache Strategy: ${CACHE_CONFIG.strategy}`);
  console.log(`   Database: ${DB_CONFIG.url.split('@')[1] || 'configured'}`);
  console.log(
    `   JWT Expiration: ${JWT_CONFIG.accessTokenExpirationMinutes}min / ${JWT_CONFIG.refreshTokenExpirationDays}d`
  );
  if (CACHE_CONFIG.strategy === 'redis') {
    console.log(`   Redis: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
  }
  console.log('');
}

// Export all configurations as a single object
export const config = {
  app: APP_CONFIG,
  db: DB_CONFIG,
  jwt: JWT_CONFIG,
  auth: AUTH_CONFIG,
  cache: CACHE_CONFIG,
  redis: REDIS_CONFIG,
  security: SECURITY_CONFIG,
  apollo: APOLLO_CONFIG,
  system: SYSTEM_CONSTANTS,
} as const;

// Export type for TypeScript consumers
export type Config = typeof config;

// ============================================================================
// Helper Objects for Express/Apollo Middleware
// ============================================================================

/** CORS configuration for Express middleware */
export const CORS_CONFIG = {
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
export const HELMET_CONFIG = {
  contentSecurityPolicy: APP_CONFIG.isProduction ? undefined : false,
} as const;

/** Server configuration */
export const SERVER_CONFIG = {
  port: APP_CONFIG.port,
  nodeEnv: APP_CONFIG.nodeEnv,
} as const;
