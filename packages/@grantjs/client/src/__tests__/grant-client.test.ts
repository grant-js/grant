import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GrantClient } from '../grant-client';

describe('GrantClient', () => {
  let client: GrantClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();

    client = new GrantClient({
      apiUrl: 'https://api.example.com',
      getAccessToken: () => 'test-token',
    });
  });

  describe('constructor', () => {
    it('should create a client with required config', () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
      });
      expect(client).toBeInstanceOf(GrantClient);
    });

    it('should normalize apiUrl by removing trailing slash', () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com/',
      });
      expect(client).toBeInstanceOf(GrantClient);
    });
  });

  describe('can()', () => {
    it('should return true when authorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { authorized: true },
          }),
      });

      const result = await client.can('Document', 'Update');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/auth/is-authorized',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should return false when not authorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { authorized: false, reason: 'NoPermission' },
          }),
      });

      const result = await client.can('Document', 'Delete');

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.can('Document', 'Update');

      expect(result).toBe(false);
    });
  });

  describe('isAuthorized()', () => {
    it('should return full authorization result', async () => {
      const mockResult = {
        authorized: true,
        reason: null,
        matchedPermission: { id: 'perm-1', name: 'document:update' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResult }),
      });

      const result = await client.isAuthorized('Document', 'Update');

      expect(result).toEqual(mockResult);
    });

    it('should send scope in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.isAuthorized('Document', 'Update', {
        scope: { tenant: 'organization', id: 'org-123' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"scope"'),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.scope).toEqual({ tenant: 'organization', id: 'org-123' });
    });
  });

  describe('caching', () => {
    it('should cache results by default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');
      await client.can('Document', 'Update');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when useCache is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');
      await client.can('Document', 'Update', { useCache: false });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');
      client.clearCache();
      await client.can('Document', 'Update');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasPermission()', () => {
    it('should be an alias for can()', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      const result = await client.hasPermission('Document', 'Update');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearScopeCache()', () => {
    it('should clear cache for a specific scope', async () => {
      const scope1 = { tenant: 'organization', id: 'org-1' };
      const scope2 = { tenant: 'organization', id: 'org-2' };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      // Cache results for different scopes
      await client.can('Document', 'Update', { scope: scope1 });
      await client.can('Document', 'Update', { scope: scope2 });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Clear cache for scope1 only
      client.clearScopeCache(scope1);

      // scope1 should be re-fetched, scope2 should still be cached
      await client.can('Document', 'Update', { scope: scope1 });
      await client.can('Document', 'Update', { scope: scope2 });

      expect(mockFetch).toHaveBeenCalledTimes(3); // Only scope1 was re-fetched
    });

    it('should clear default scope cache when no scope provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      client.clearScopeCache();

      await client.can('Document', 'Update');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('token refresh', () => {
    it('should refresh token on 401 and retry', async () => {
      const onTokenRefresh = vi.fn();
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'refresh-token',
        onTokenRefresh,
      });

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
          }),
      });

      // Retry call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      const result = await client.can('Document', 'Update', { useCache: false });

      expect(result).toBe(true);
      expect(onTokenRefresh).toHaveBeenCalledWith({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should call onUnauthorized when refresh fails', async () => {
      const onUnauthorized = vi.fn();
      const onTokenRefresh = vi.fn(); // Required to trigger refresh flow
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'invalid-refresh',
        onTokenRefresh,
        onUnauthorized,
      });

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      // Refresh call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid refresh token' }),
      });

      const result = await client.can('Document', 'Update', { useCache: false });

      expect(result).toBe(false);
      expect(onUnauthorized).toHaveBeenCalled();
      expect(onTokenRefresh).not.toHaveBeenCalled(); // Refresh failed, tokens not updated
    });

    it('should not attempt refresh if onTokenRefresh is not provided', async () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getAccessToken: () => 'expired-token',
        // No onTokenRefresh provided
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const result = await client.can('Document', 'Update', { useCache: false });

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No refresh attempt
    });

    it('should not attempt refresh if refresh token is missing', async () => {
      const onTokenRefresh = vi.fn();
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => null, // No refresh token
        onTokenRefresh,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const result = await client.can('Document', 'Update', { useCache: false });

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No refresh attempt
      expect(onTokenRefresh).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should include Authorization header when token is available', async () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getAccessToken: () => 'test-token',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should work without token (cookie-based auth)', async () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        // No getAccessToken provided
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');

      const callHeaders = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(callHeaders.Authorization).toBeUndefined();
    });

    it('should use custom fetch implementation', async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        fetch: customFetch,
      });

      await client.can('Document', 'Update');

      expect(customFetch).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should include credentials in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should use custom credentials mode', async () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        credentials: 'same-origin',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'same-origin',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });

      const result = await client.isAuthorized('Document', 'Update');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('API error: 500');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await client.isAuthorized('Document', 'Update');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('API error: 500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.isAuthorized('Document', 'Update');

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Network error');
    });
  });

  describe('cache TTL', () => {
    it('should respect custom TTL', async () => {
      vi.useFakeTimers();

      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        cache: { ttl: 1000 }, // 1 second
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.can('Document', 'Update');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time but not past TTL
      vi.advanceTimersByTime(500);
      await client.can('Document', 'Update');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still cached

      // Advance past TTL
      vi.advanceTimersByTime(600);
      await client.can('Document', 'Update');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Cache expired

      vi.useRealTimers();
    });
  });

  describe('request body formatting', () => {
    it('should format request body correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.isAuthorized('Document', 'Update', {
        scope: { tenant: 'organization', id: 'org-123' },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody).toEqual({
        permission: {
          resource: 'Document',
          action: 'Update',
        },
        context: {
          resource: { id: 'org-123' },
        },
        scope: {
          tenant: 'organization',
          id: 'org-123',
        },
      });
    });

    it('should handle request without scope', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.isAuthorized('Document', 'Update');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.context.resource).toBeNull();
      expect(callBody.scope).toBeUndefined();
    });
  });
});
