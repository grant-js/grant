import type {
  AuthorizationReason,
  AuthorizationResult as SchemaAuthorizationResult,
} from '@grantjs/schema';

// Re-exported from @grantjs/schema, which is generated from the GraphQL SDL and is the
// single source of truth for these shapes. `AuthorizationResult`, `Permission` and
// `Resource` were previously hand-written here AND byte-identically in @grantjs/client;
// both copies described the payload of POST /api/auth/is-authorized less accurately than
// the SDL does. See AGENTS.md § API surface: do not redefine or duplicate codegen types.
export type { Scope, Tenant } from '@grantjs/schema';

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
 * Options for permission checks
 */
export interface PermissionCheckOptions {
  /** Resource context for condition evaluation */
  context?: {
    resource?: Record<string, unknown> | null;
  };
}

/**
 * Resource resolver function type
 * Used to resolve resource data for condition evaluation
 */
export interface ResourceResolverParams {
  resourceSlug: string;
  request: unknown;
  [key: string]: unknown;
}

export type ResourceResolverResult<T = Record<string, unknown>> = T | null;

export type ResourceResolver<TResult = Record<string, unknown>> = (
  params: ResourceResolverParams
) => Promise<ResourceResolverResult<TResult>>;
