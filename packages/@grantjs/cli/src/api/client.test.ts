import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exchangeApiKey, fetchResources, fetchPermissions } from './client.js';

describe('exchangeApiKey', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const u = new URL(url);
        if (u.pathname !== '/api/auth/token') {
          return Promise.resolve(new Response('Not Found', { status: 404 }));
        }
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (body.clientId !== 'id' || body.clientSecret !== 'secret') {
          return Promise.resolve(
            new Response(
              JSON.stringify({ success: false, error: { message: 'Invalid credentials' } }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: 'token-123', expiresIn: 900 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      })
    );
  });

  it('returns access token on success', async () => {
    const result = await exchangeApiKey('http://localhost:4000', {
      clientId: 'id',
      clientSecret: 'secret',
      scope: { id: 'a:b', tenant: 'accountProject' },
    });
    expect(result.accessToken).toBe('token-123');
    expect(result.expiresIn).toBe(900);
  });

  it('calls POST /api/auth/token with correct body', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await exchangeApiKey('https://api.example.com', {
      clientId: 'cid',
      clientSecret: 'secret32charsminimumrequired!!',
      scope: { id: 'org:proj', tenant: 'organizationProject' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'cid',
          clientSecret: 'secret32charsminimumrequired!!',
          scope: { id: 'org:proj', tenant: 'organizationProject' },
        }),
      })
    );
  });

  it('throws on 401 with error message from body', async () => {
    await expect(
      exchangeApiKey('http://localhost:4000', {
        clientId: 'wrong',
        clientSecret: 'secret',
        scope: { id: 'a:b', tenant: 'accountProject' },
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws when response has no accessToken', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, data: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    );
    await expect(
      exchangeApiKey('http://localhost:4000', {
        clientId: 'id',
        clientSecret: 'secret',
        scope: { id: 'a:b', tenant: 'accountProject' },
      })
    ).rejects.toThrow('missing accessToken');
  });
});

describe('fetchResources', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const u = new URL(url);
        if (u.pathname === '/api/resources') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  resources: [
                    { id: '1', slug: 'document', name: 'Document', actions: ['Read'] },
                    { id: '2', slug: 'report', name: 'Report', actions: ['Read', 'Create'] },
                  ],
                  totalCount: 2,
                  hasNextPage: false,
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      })
    );
  });

  it('returns all resources for scope', async () => {
    const items = await fetchResources('http://localhost:4000', 'bearer-token', {
      id: 'org:proj',
      tenant: 'organizationProject',
    });
    expect(items).toHaveLength(2);
    expect(items[0]!.slug).toBe('document');
    expect(items[1]!.slug).toBe('report');
  });

  it('sends Authorization header and scope query params', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await fetchResources('http://api.test', 'token', {
      id: 'a:b',
      tenant: 'accountProject',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/resources'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      })
    );
    const callUrl = (fetchMock.mock.calls[0] as [string])[0];
    expect(callUrl).toContain('scopeId=a%3Ab');
    expect(callUrl).toContain('tenant=accountProject');
  });
});

describe('fetchPermissions', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const u = new URL(url);
        if (u.pathname === '/api/permissions') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: {
                  permissions: [
                    { id: '1', action: 'Create', name: 'Create' },
                    { id: '2', action: 'Read', name: 'Read' },
                  ],
                  totalCount: 2,
                  hasNextPage: false,
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      })
    );
  });

  it('returns all permissions for scope', async () => {
    const items = await fetchPermissions('http://localhost:4000', 'bearer-token', {
      id: 'org:proj',
      tenant: 'organizationProject',
    });
    expect(items).toHaveLength(2);
    expect(items[0]!.action).toBe('Create');
    expect(items[1]!.action).toBe('Read');
  });
});
