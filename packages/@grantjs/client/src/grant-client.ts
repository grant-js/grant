import type {
  AuthorizationResult,
  GrantClientConfig,
  PermissionQueryOptions,
  Scope,
  SignInWithProjectAppOptions,
} from './types';

/**
 * Module-level shared promise for cookie-only credential refresh so that all 401s
 * (across all GrantClient instances and in-flight requests) coalesce into one refresh.
 */
let sharedCredentialsRefreshPromise: Promise<boolean> | null = null;

/**
 * Module-level shared promise for MFA step-up so that concurrent 403 MFA_REQUIRED
 * responses coalesce into a single step-up dialog.
 */
let sharedMfaStepUpPromise: Promise<boolean> | null = null;

/**
 * Grant Client for browser applications
 *
 * Makes HTTP requests to the Grant API to check permissions
 * and retrieve authorization data. Supports both token-based
 * and cookie-based authentication with automatic token refresh.
 */
export class GrantClient {
  private config: Required<Pick<GrantClientConfig, 'apiUrl'>> & GrantClientConfig;
  private cache: Map<string, { data: unknown; expires: number }> = new Map();
  private defaultTtl: number;

  constructor(config: GrantClientConfig) {
    this.config = config;
    this.defaultTtl = config.cache?.ttl ?? 5 * 60 * 1000; // 5 minutes default
  }

  // ============================================================================
  // Public API - Permission Checks
  // ============================================================================

  /**
   * Check if the current user has a specific permission
   *
   * @example
   * ```ts
   * const canEdit = await grant.can('document', 'update');
   * if (canEdit) {
   *   // Show edit button
   * }
   * ```
   */
  async can(resource: string, action: string, options?: PermissionQueryOptions): Promise<boolean> {
    const result = await this.isAuthorized(resource, action, options);
    return result.authorized;
  }

  /**
   * Alias for `can` - check if user has permission
   */
  async hasPermission(
    resource: string,
    action: string,
    options?: PermissionQueryOptions
  ): Promise<boolean> {
    return this.can(resource, action, options);
  }

  // ============================================================================
  // Public API - Project OAuth (sign-in with project app)
  // ============================================================================

  /**
   * Start project-app OAuth flow (redirect only).
   * Navigates the current window to the Grant OAuth entry page. Hosted pages attach
   * PKCE (S256) to `GET /api/auth/project/authorize`. After sign-in and consent,
   * the user is redirected to the app's `redirect_uri` with `?code=` and `state`
   * (authorization code, not a fragment token). Exchange the code at
   * `POST /api/auth/project/token` with `grant_type=authorization_code` and the
   * PKCE `code_verifier` (same-origin Grant relay does this for Test OAuth).
   *
   * Requires `config.frontendUrl` and `redirectUri`.
   */
  async signInWithProjectApp(options: SignInWithProjectAppOptions): Promise<void> {
    const frontendUrl = this.config.frontendUrl;
    if (!frontendUrl) {
      throw new Error('GrantClient: frontendUrl is required for signInWithProjectApp');
    }
    const locale = options.locale ?? 'en';
    const redirectUri = options.redirectUri;
    if (!redirectUri) {
      throw new Error('redirectUri is required for signInWithProjectApp');
    }

    const entryPath = `/${locale}/auth/project`;
    const params = new URLSearchParams({
      client_id: options.clientId,
      redirect_uri: redirectUri,
      state: options.state ?? '',
    });
    if (options.scope) params.set('scope', options.scope);

    const entryUrl = `${frontendUrl.replace(/\/$/, '')}${entryPath}?${params.toString()}`;
    if (typeof window !== 'undefined') {
      window.location.href = entryUrl;
    }
  }

  /**
   * Check authorization with full result details
   *
   * @example
   * ```ts
   * const result = await grant.isAuthorized('document', 'update');
   * if (!result.authorized) {
   *   console.log('Denied:', result.reason);
   * }
   * ```
   */
  async isAuthorized(
    resource: string,
    action: string,
    options?: PermissionQueryOptions
  ): Promise<AuthorizationResult> {
    const contextResourceKey =
      options?.context?.resource != null ? JSON.stringify(options.context.resource) : undefined;
    const cacheKey = this.getCacheKey('auth', resource, action, options?.scope, contextResourceKey);

    // Check cache first (unless explicitly disabled)
    if (options?.useCache !== false) {
      const cached = this.getFromCache<AuthorizationResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      // API expects: { permission: { resource, action }, context: { resource?: any }, scope?: { tenant, id } }
      // scope is optional - for session tokens it enables dynamic scope switching
      const scope = options?.scope;
      const hasValidScope =
        scope && typeof scope === 'object' && 'tenant' in scope && 'id' in scope;
      // When scope is provided and context.resource is not, derive context.resource from scope.id
      const contextResource =
        options?.context?.resource ??
        (hasValidScope && scope && 'id' in scope && scope.id != null ? { id: scope.id } : null);

      const response = await this.fetchWithAuth('/api/auth/is-authorized', {
        method: 'POST',
        body: JSON.stringify({
          permission: {
            resource,
            action,
          },
          context: {
            resource: contextResource,
          },
          // Pass scope for dynamic scope override (only works with session tokens)
          ...(hasValidScope && { scope }),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          authorized: false,
          reason: error.message || `API error: ${response.status}`,
        };
      }

      const json = await response.json();
      // API returns { success: true, data: { authorized, ... } }
      const result: AuthorizationResult = json.data ?? json;
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      return {
        authorized: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Public API - Cache Management
  // ============================================================================

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cached data for a specific scope
   */
  clearScopeCache(scope?: Scope): void {
    const scopeKey = scope ? JSON.stringify(scope) : 'default';
    for (const key of this.cache.keys()) {
      if (key.includes(scopeKey)) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================================================
  // Private - HTTP & Authentication
  // ============================================================================

  /**
   * Make an authenticated fetch request with automatic token refresh on 401
   * and MFA step-up on 403 MFA_REQUIRED.
   */
  private async fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
    const response = await this.doFetch(url, init);

    if (response.status === 403 && this.config.onMfaRequired) {
      const cloned = response.clone();
      const body = await cloned.json().catch(() => null);
      if (body && (body.code === 'MFA_REQUIRED' || body.extensions?.reason === 'MFA_REQUIRED')) {
        if (!sharedMfaStepUpPromise) {
          sharedMfaStepUpPromise = this.config.onMfaRequired().finally(() => {
            sharedMfaStepUpPromise = null;
          });
        }
        const verified = await sharedMfaStepUpPromise;
        if (verified) return this.doFetch(url, init);
      }
    }

    if (response.status !== 401) return response;

    // Cookie-based refresh (HttpOnly refresh cookie). Body-based refresh is not supported.
    // Module-level shared promise so all 401s (any client instance) coalesce into one refresh.
    if (this.config.onRefreshWithCredentials) {
      if (!sharedCredentialsRefreshPromise) {
        sharedCredentialsRefreshPromise = this.config.onRefreshWithCredentials().finally(() => {
          sharedCredentialsRefreshPromise = null;
        });
      }
      const refreshed = await sharedCredentialsRefreshPromise;
      if (refreshed) return this.doFetch(url, init);
      this.config.onUnauthorized?.();
    }

    return response;
  }

  /**
   * Perform the actual fetch request
   */
  private async doFetch(url: string, init?: RequestInit): Promise<Response> {
    const fetchFn = this.config.fetch ?? globalThis.fetch;
    const fullUrl = url.startsWith('http') ? url : `${this.config.apiUrl}${url}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    };

    // Add authorization header if token is available
    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetchFn(fullUrl, {
      ...init,
      headers,
      // Include cookies for same-origin requests (supports cookie-based auth)
      credentials: this.config.credentials ?? 'include',
    });
  }

  /**
   * Get the current access token
   */
  private async getToken(): Promise<string | null> {
    if (this.config.getAccessToken) {
      const token = this.config.getAccessToken();
      return token instanceof Promise ? token : token;
    }
    return null;
  }

  // ============================================================================
  // Private - Cache & URL Helpers
  // ============================================================================

  private buildUrl(path: string, scope?: Scope): string {
    const url = new URL(path, this.config.apiUrl);
    if (scope) {
      url.searchParams.set('scope', JSON.stringify(scope));
    }
    return url.toString();
  }

  private getCacheKey(...parts: (string | Scope | undefined)[]): string {
    const prefix = this.config.cache?.prefix ?? 'grant';
    return `${prefix}:${parts.map((p) => (p ? JSON.stringify(p) : 'default')).join(':')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.defaultTtl,
    });
  }
}
