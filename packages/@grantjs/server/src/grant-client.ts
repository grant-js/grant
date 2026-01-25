import { extractTokenFromRequest } from './utils/token-extractor';

import type {
  GrantServerConfig,
  AuthorizationResult,
  PermissionCheckOptions,
  AuthTokens,
} from './types';

/**
 * Grant Client for server-side applications
 *
 * Makes HTTP requests to the Grant API to check permissions.
 * Supports token-based and cookie-based authentication with automatic token refresh.
 * No caching - server-side caching is handled by grant-api.
 */
export class GrantClient {
  public readonly config: Required<Pick<GrantServerConfig, 'apiUrl'>> & GrantServerConfig;
  private refreshPromise: Promise<AuthTokens | null> | null = null;

  constructor(config: GrantServerConfig) {
    this.config = config;
  }

  // ============================================================================
  // Public API - Permission Checks
  // ============================================================================

  /**
   * Check if the current user has a specific permission
   *
   * @example
   * ```ts
   * const canEdit = await grant.isGranted('document', 'update', { scope });
   * if (canEdit) {
   *   // Proceed with operation
   * }
   * ```
   */
  async isGranted(
    resource: string,
    action: string,
    options?: PermissionCheckOptions,
    request?: unknown
  ): Promise<boolean> {
    const result = await this.isAuthorized(resource, action, options, request);
    return result.authorized;
  }

  /**
   * Check authorization with full result details
   *
   * @example
   * ```ts
   * const result = await grant.isAuthorized('document', 'update', { scope }, request);
   * if (!result.authorized) {
   *   console.log('Denied:', result.reason);
   * }
   * ```
   */
  async isAuthorized(
    resource: string,
    action: string,
    options?: PermissionCheckOptions,
    request?: unknown
  ): Promise<AuthorizationResult> {
    try {
      // API expects: { permission: { resource, action }, context: { resource?: any }, scope?: { tenant, id } }
      const response = await this.fetchWithAuth(
        '/api/auth/is-authorized',
        {
          method: 'POST',
          body: JSON.stringify({
            permission: {
              resource,
              action,
            },
            context: {
              resource: options?.context?.resource || null,
            },
            // Pass scope for dynamic scope override (only works with session tokens)
            ...(options?.scope && { scope: options.scope }),
          }),
        },
        request
      );

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
      return result;
    } catch (error) {
      return {
        authorized: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract token from a request object
   * Useful for middleware that needs to extract token before making authorization calls
   */
  async getTokenFromRequest(request: unknown): Promise<string | null> {
    return extractTokenFromRequest(request, this.config);
  }

  // ============================================================================
  // Private - HTTP & Authentication
  // ============================================================================

  /**
   * Make an authenticated fetch request with automatic token refresh on 401
   */
  private async fetchWithAuth(
    url: string,
    init?: RequestInit,
    request?: unknown
  ): Promise<Response> {
    const response = await this.doFetch(url, init, request);

    // If unauthorized and we have refresh capability, try to refresh and retry
    if (response.status === 401 && this.config.onTokenRefresh && request) {
      const refreshed = await this.tryRefreshToken(request);
      if (refreshed) {
        // Retry the original request with new token
        return this.doFetch(url, init, request);
      }
    }

    return response;
  }

  /**
   * Perform the actual fetch request
   */
  private async doFetch(url: string, init?: RequestInit, request?: unknown): Promise<Response> {
    const fetchFn = this.config.fetch ?? globalThis.fetch;
    const fullUrl = url.startsWith('http') ? url : `${this.config.apiUrl}${url}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    };

    // Add authorization header if token is available
    if (request) {
      const token = await extractTokenFromRequest(request, this.config);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Forward cookies if using cookie-based auth
      const req = request as { headers?: { cookie?: string } };
      if (req.headers?.cookie) {
        headers['Cookie'] = req.headers.cookie;
      }
    }

    return fetchFn(fullUrl, {
      ...init,
      headers,
      // Include cookies for same-origin requests (supports cookie-based auth)
      credentials: this.config.credentials ?? 'include',
    });
  }

  /**
   * Attempt to refresh the access token
   * Uses a shared promise to prevent multiple simultaneous refresh attempts
   */
  private async tryRefreshToken(request: unknown): Promise<boolean> {
    // If already refreshing, wait for the existing promise
    if (this.refreshPromise) {
      const result = await this.refreshPromise;
      return result !== null;
    }

    // Check if we have refresh capability
    if (!this.config.onTokenRefresh || !this.config.getRefreshToken) {
      return false;
    }

    const refreshToken = await this.config.getRefreshToken(request);
    const accessToken = await extractTokenFromRequest(request, this.config);

    if (!refreshToken || !accessToken) {
      return false;
    }

    // Start refresh process
    this.refreshPromise = this.performTokenRefresh(accessToken, refreshToken, request);

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
    refreshToken: string,
    request: unknown
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
        await this.config.onUnauthorized?.(request);
        return null;
      }

      const json = await response.json();
      const tokens: AuthTokens = json.data ?? json;

      // Notify the app about the new tokens
      await this.config.onTokenRefresh?.(tokens, request);

      return tokens;
    } catch (error) {
      console.error('[GrantClient] Token refresh failed:', error);
      await this.config.onUnauthorized?.(request);
      return null;
    }
  }
}
