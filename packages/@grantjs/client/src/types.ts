import type {
  AuthorizationReason,
  AuthorizationResult as SchemaAuthorizationResult,
  Scope,
} from '@grantjs/schema';

// Re-exported from @grantjs/schema, which is generated from the GraphQL SDL and is the
// single source of truth for these shapes. `AuthorizationResult`, `Permission` and
// `Resource` were previously hand-written here AND byte-identically in @grantjs/server;
// both copies described the payload of POST /api/auth/is-authorized less accurately than
// the SDL does. See AGENTS.md § API surface: do not redefine or duplicate codegen types.
export type { Permission, Resource, Scope, Tenant } from '@grantjs/schema';

/**
 * Result of an authorization check.
 *
 * Derived from `@grantjs/schema`'s codegen'd type rather than redefined, so every field
 * tracks the SDL automatically -- with one deliberate widening. The SDK reports its own
 * transport failures through the same channel the server uses for `AuthorizationReason`:
 * on a network error or a non-OK response it returns
 * `{ authorized: false, reason: 'Unknown error' }`. So the SDK's `reason` is the wire
 * enum OR a locally synthesised message, and the type has to say so.
 *
 * `(string & {})` keeps the union assignable in both directions -- consumers who treated
 * `reason` as a plain `string` still compile -- while giving editors autocomplete on the
 * eight `AuthorizationReason` members. Do not narrow it to the bare enum without a major:
 * that would break every `reason === 'some literal'` comparison downstream.
 */
export type AuthorizationResult = Omit<SchemaAuthorizationResult, 'reason'> & {
  reason?: AuthorizationReason | (string & {}) | null;
};

/**
 * Options for project-app OAuth sign-in (redirect only).
 */
export interface SignInWithProjectAppOptions {
  /** Project app client_id */
  clientId: string;
  /** Callback URL; user is redirected here with token in the URL fragment after consent */
  redirectUri: string;
  /** Optional scope (if app supports dynamic scope) */
  scope?: string;
  /** Optional state to round-trip */
  state?: string;
  /** Locale for entry URL (e.g. 'en'). Default 'en'. */
  locale?: string;
}

/**
 * Configuration for the Grant client
 */
export interface GrantClientConfig {
  /**
   * Grant API URL (e.g., "https://api.grant.com")
   */
  apiUrl: string;

  /**
   * Grant web app (frontend) URL for project OAuth entry (e.g. "https://app.grant.com").
   * Required for signInWithProjectApp. Entry URL: {frontendUrl}/{locale}/auth/project.
   */
  frontendUrl?: string;

  /**
   * Function to get the current access token
   * Return null if not authenticated
   */
  getAccessToken?: () => string | null | Promise<string | null>;

  /**
   * Callback when the access token is updated after a cookie-based refresh.
   * The API returns only `accessToken` in the refresh response body; the refresh token stays in an HttpOnly cookie.
   * Use this to update your in-memory or cookie-based access token so subsequent requests use the new token.
   */
  onTokenRefresh?: (tokens: AuthTokens) => void | Promise<void>;

  /**
   * Callback when authentication fails (after refresh attempt)
   * Use this to redirect to login
   */
  onUnauthorized?: () => void;

  /**
   * **Session refresh (cookie-based).** Called on 401 to refresh the session using the HttpOnly refresh cookie.
   * Your callback should: (1) call `POST /api/auth/refresh` with `credentials: 'include'`, (2) parse the
   * response for the new `accessToken`, (3) update your app token storage (e.g. set the new access token so
   * `getAccessToken` returns it), and optionally call the same logic you pass to `onTokenRefresh`. Return `true`
   * if refresh succeeded so the client can retry the request.
   * Refresh tokens are not sent in the request body; the API uses only the HttpOnly refresh cookie.
   */
  onRefreshWithCredentials?: () => Promise<boolean>;

  /**
   * Called when a request is rejected with MFA_REQUIRED (HTTP 403).
   * Return `true` after the user completes MFA verification so the client retries the request
   * with the updated access token, or `false` to accept the denial.
   */
  onMfaRequired?: () => Promise<boolean>;

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
 * Auth tokens from the refresh endpoint. With cookie-based refresh, the API returns only `accessToken` in the
 * response body; `refreshToken` is set in an HttpOnly cookie and is not exposed to JS, so it may be undefined.
 */
export interface AuthTokens {
  accessToken: string;
  /** Undefined when using cookie-based refresh (refresh token is HttpOnly cookie). */
  refreshToken?: string;
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
 * Error response from the API
 */
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
