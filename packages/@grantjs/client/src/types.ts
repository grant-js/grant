import type { Scope } from '@grantjs/schema';

// Re-export schema types for convenience
export type { Scope, Tenant } from '@grantjs/schema';

/**
 * Configuration for the Grant client
 */
export interface GrantClientConfig {
  /**
   * Grant API URL (e.g., "https://api.grant.com")
   */
  apiUrl: string;

  /**
   * Function to get the current access token
   * Return null if not authenticated
   */
  getAccessToken?: () => string | null | Promise<string | null>;

  /**
   * Function to get the current refresh token
   * Required for automatic token refresh on 401
   */
  getRefreshToken?: () => string | null | Promise<string | null>;

  /**
   * Callback when tokens are refreshed
   * Use this to update your token storage
   */
  onTokenRefresh?: (tokens: AuthTokens) => void | Promise<void>;

  /**
   * Callback when authentication fails (after refresh attempt)
   * Use this to redirect to login
   */
  onUnauthorized?: () => void;

  /**
   * Custom fetch implementation
   * Defaults to globalThis.fetch
   */
  fetch?: typeof fetch;

  /**
   * Credentials mode for fetch requests
   * Defaults to 'include' for cookie support
   */
  credentials?: RequestCredentials;

  /**
   * Cache configuration
   */
  cache?: CacheOptions;
}

/**
 * Auth tokens returned from refresh endpoint
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /**
   * Default TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl?: number;

  /**
   * Key prefix for cache entries
   * @default 'grant'
   */
  prefix?: string;
}

/**
 * Result of an authorization check
 */
export interface AuthorizationResult {
  /** Whether the action is authorized */
  authorized: boolean;
  /** Human-readable reason for the decision */
  reason?: string;
  /** The permission that matched (if authorized) */
  matchedPermission?: Permission;
}

/**
 * Options for permission queries
 */
export interface PermissionQueryOptions {
  /** Scope to check permissions in */
  scope?: Scope;
  /** Whether to use cached results (default: true) */
  useCache?: boolean;
  /** Resource to check permissions for */
  context?: {
    resource?: Record<string, unknown> | null;
  };
}

/**
 * Permission entity
 */
export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  action: string;
  resourceId?: string | null;
  resource?: Resource | null;
  condition?: unknown;
}

/**
 * Resource entity
 */
export interface Resource {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  actions: string[];
}

/**
 * Error response from the API
 */
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
