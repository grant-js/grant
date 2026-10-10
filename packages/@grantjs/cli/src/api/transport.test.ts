import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CliError } from './errors.js';
import { apiRequest } from './transport.js';

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { id: 'u1' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    );
  });

  it('unwraps the data envelope and sends bearer plus origin-verify', async () => {
    const result = await apiRequest({
      apiUrl: 'http://localhost:4000',
      method: 'GET',
      path: '/api/me',
      token: 'tok',
      originVerifySecret: 'secret',
      query: { tenant: 'organizationProject' },
    });
    expect(result.data).toEqual({ id: 'u1' });
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/me?tenant=organizationProject',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok',
          'x-origin-verify': 'secret',
        }),
      })
    );
  });

  it('throws CliError with auth exit code on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401 })
        )
      )
    );
    await expect(
      apiRequest({ apiUrl: 'http://localhost:4000', method: 'GET', path: '/api/me' })
    ).rejects.toMatchObject({ exitCode: 2 } satisfies Partial<CliError>);
  });
});
