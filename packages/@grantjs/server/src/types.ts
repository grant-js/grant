import type { Scope } from '@grantjs/schema';

// Re-export schema types for convenience
export type { Scope, Tenant } from '@grantjs/schema';

/**
 * Configuration for the Grant server client
 */
export interface GrantServerConfig {
  /**
   * Grant API URL (e.g., "https://api.grant.com")
   */
  apiUrl: string;

  /**
   * Cookie name for access token (if using cookie-based auth)
   * Default: 'grant-access-token'
   */
  cookieName?: string;

  /**
   * Custom function to extract token from request
   * If provided, this takes precedence over default extraction (header/cookie)
   */
  getToken?: (request: unknown) => string | null | Promise<string | null>;

  /**
   * Function to get the current refresh token
   * Required for automatic token refresh on 401
   */
  getRefreshToken?: (request: unknown) => string | null | Promise<string | null>;

  /**
   * Callback when tokens are refreshed
   * Use this to update your token storage
   */
  onTokenRefresh?: (tokens: AuthTokens, request: unknown) => void | Promise<void>;

  /**
   * Callback when authentication fails (after refresh attempt)
   * Use this to handle unauthorized requests
   */
  onUnauthorized?: (request: unknown) => void | Promise<void>;

  /**
   * Custom fetch implementation
   * Defaults to globalThis.fetch (Node.js 18+) or node-fetch
   */
  fetch?: typeof fetch;

  /**
   * Credentials mode for fetch requests
   * Defaults to 'include' for cookie support
   */
  credentials?: RequestCredentials;
}

/**
 * Auth tokens returned from refresh endpoint
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
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
 * Options for permission checks
 */
export interface PermissionCheckOptions {
  /** Scope to check permissions in */
  scope?: Scope;
  /** Resource context for condition evaluation */
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

/**
 * Resource resolver function type
 * Used to resolve resource data for condition evaluation
 */
export interface ResourceResolverParams {
  resourceSlug: string;
  scope: Scope;
  request: unknown;
  [key: string]: unknown;
}

export type ResourceResolverResult<T = Record<string, unknown>> = T | null;

export type ResourceResolver<TResult = Record<string, unknown>> = (
  params: ResourceResolverParams
) => Promise<ResourceResolverResult<TResult>>;

/**
 * Scope resolver function type
 * Used to extract or compute scope from request
 */
export type ScopeResolver = (request: unknown) => Scope | null | Promise<Scope | null>;
