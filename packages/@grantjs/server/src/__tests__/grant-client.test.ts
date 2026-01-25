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
      getToken: () => 'test-token',
    });
  });

  describe('constructor', () => {
    it('should create a client with required config', () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
      });
      expect(client).toBeInstanceOf(GrantClient);
    });
  });

  describe('isGranted()', () => {
    it('should return true when authorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { authorized: true },
          }),
      });

      const result = await client.isGranted('Document', 'Update');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/auth/is-authorized',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
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

      const result = await client.isGranted('Document', 'Delete');

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.isGranted('Document', 'Update');

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

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.scope).toEqual({ tenant: 'organization', id: 'org-123' });
    });

    it('should send resource context in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await client.isAuthorized('Document', 'Update', {
        context: { resource: { id: 'doc-123', ownerId: 'user-456' } },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.context.resource).toEqual({ id: 'doc-123', ownerId: 'user-456' });
    });
  });

  describe('token extraction', () => {
    it('should extract token from request using custom getToken', async () => {
      const customClient = new GrantClient({
        apiUrl: 'https://api.example.com',
        getToken: (request) => {
          return (request as { token?: string }).token || null;
        },
      });

      const mockRequest = { token: 'custom-token' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { authorized: true } }),
      });

      await customClient.isAuthorized('Document', 'Update', undefined, mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer custom-token',
          }),
        })
      );
    });
  });

  describe('token refresh', () => {
    it('should refresh token on 401 and retry', async () => {
      const onTokenRefresh = vi.fn();
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getToken: () => 'expired-token',
        getRefreshToken: () => 'refresh-token',
        onTokenRefresh,
      });

      const mockRequest = {};

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

      const result = await client.isAuthorized('Document', 'Update', undefined, mockRequest);

      expect(result.authorized).toBe(true);
      expect(onTokenRefresh).toHaveBeenCalledWith(
        {
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
        },
        mockRequest
      );
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should call onUnauthorized when refresh fails', async () => {
      const onUnauthorized = vi.fn();
      const onTokenRefresh = vi.fn();
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
        getToken: () => 'expired-token',
        getRefreshToken: () => 'invalid-refresh',
        onTokenRefresh,
        onUnauthorized,
      });

      const mockRequest = {};

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

      const result = await client.isAuthorized('Document', 'Update', undefined, mockRequest);

      expect(result.authorized).toBe(false);
      expect(onUnauthorized).toHaveBeenCalledWith(mockRequest);
      expect(onTokenRefresh).not.toHaveBeenCalled();
    });
  });
});
