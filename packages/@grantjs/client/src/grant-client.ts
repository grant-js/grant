import type {
  GrantClientConfig,
  AuthorizationResult,
  PermissionQueryOptions,
  Scope,
  AuthTokens,
} from './types';

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
  private refreshPromise: Promise<AuthTokens | null> | null = null;

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

      const response = await this.fetchWithAuth('/api/auth/is-authorized', {
        method: 'POST',
        body: JSON.stringify({
          permission: {
            resource,
            action,
          },
          context: {
            resource: options?.context?.resource ?? null,
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
   */
  private async fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
    const response = await this.doFetch(url, init);

    // If unauthorized and we have refresh capability, try to refresh and retry
    if (response.status === 401 && this.config.onTokenRefresh) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        return this.doFetch(url, init);
      }
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

  /**
   * Attempt to refresh the access token
   * Uses a shared promise to prevent multiple simultaneous refresh attempts
   */
  private async tryRefreshToken(): Promise<boolean> {
    // If already refreshing, wait for the existing promise
    if (this.refreshPromise) {
      const result = await this.refreshPromise;
      return result !== null;
    }

    // Check if we have refresh capability
    if (!this.config.onTokenRefresh || !this.config.getRefreshToken) {
      return false;
    }

    const refreshToken = await this.config.getRefreshToken();
    const accessToken = await this.getToken();

    if (!refreshToken || !accessToken) {
      return false;
    }

    // Start refresh process
    this.refreshPromise = this.performTokenRefresh(accessToken, refreshToken);

    try {
      const result = await this.refreshPromise;
      return result !== null;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the token refresh API call
   */
  private async performTokenRefresh(
    accessToken: string,
    refreshToken: string
  ): Promise<AuthTokens | null> {
    try {
      const fetchFn = this.config.fetch ?? globalThis.fetch;
      const response = await fetchFn(`${this.config.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: this.config.credentials ?? 'include',
        body: JSON.stringify({
          accessToken,
          refreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh failed - trigger unauthorized handler
        this.config.onUnauthorized?.();
        return null;
      }

      const json = await response.json();
      const tokens: AuthTokens = json.data ?? json;

      // Notify the app about the new tokens
      await this.config.onTokenRefresh?.(tokens);

      return tokens;
    } catch (error) {
      console.error('[GrantClient] Token refresh failed:', error);
      this.config.onUnauthorized?.();
      return null;
    }
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
