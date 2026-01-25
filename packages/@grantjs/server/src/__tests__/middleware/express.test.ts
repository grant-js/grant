import { beforeEach, describe, expect, it, vi } from 'vitest';

import { grant, type AuthorizedRequest } from '../../express/middleware';
import { GrantClient } from '../../grant-client';

import type { Request, Response, NextFunction } from 'express';

describe('grant Express Middleware', () => {
  let client: GrantClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    global.fetch = mockFetch = vi.fn();
    mockFetch.mockReset();

    client = new GrantClient({
      apiUrl: 'https://api.example.com',
      getToken: (request) => {
        const req = request as { headers?: { authorization?: string } };
        return req.headers?.authorization?.replace('Bearer ', '') || null;
      },
    });

    mockReq = {
      headers: {
        authorization: 'Bearer test-token',
        'x-scope-tenant': 'organization',
        'x-scope-id': 'org-123',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should call next() when authorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { authorized: true } }),
    });

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Query',
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no token', async () => {
    mockReq.headers = {};

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Query',
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      code: 'UNAUTHENTICATED',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 when scope is missing', async () => {
    mockReq.headers = {
      authorization: 'Bearer test-token',
    };

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Query',
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Scope required',
        code: 'SCOPE_REQUIRED',
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when not authorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { authorized: false, reason: 'NoPermission' },
        }),
    });

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Delete',
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      code: 'FORBIDDEN',
      reason: 'NoPermission',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should use resource resolver when provided', async () => {
    const resourceResolver = vi.fn().mockResolvedValue({ id: 'org-123', name: 'Test Org' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { authorized: true } }),
    });

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Update',
      resourceResolver,
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(resourceResolver).toHaveBeenCalledWith({
        resourceSlug: 'Organization',
      scope: { tenant: 'organization', id: 'org-123' },
      request: mockReq,
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 404 when resource resolver returns null', async () => {
    const resourceResolver = vi.fn().mockResolvedValue(null);

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Update',
      resourceResolver,
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Resource not found',
      code: 'NOT_FOUND',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should use custom scope resolver when provided', async () => {
    const scopeResolver = vi.fn().mockResolvedValue({
      tenant: 'account',
      id: 'account-123',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { authorized: true } }),
    });

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Query',
      scopeResolver,
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(scopeResolver).toHaveBeenCalledWith(mockReq);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should attach authorization result to request', async () => {
    const authResult = {
      authorized: true,
      reason: null,
      matchedPermission: { id: 'perm-1' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: authResult }),
    });

    const middleware = grant(client, {
      resource: 'Organization',
      action: 'Query',
    });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as AuthorizedRequest).authorization).toEqual(authResult);
  });
});
