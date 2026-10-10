import { describe, expect, it } from 'vitest';

import { applyPathParams, mapOperation, mapOperations } from './map-commands.js';
import type { CliOperation } from './types.js';

const op = (over: Partial<CliOperation> & Pick<CliOperation, 'method' | 'path'>): CliOperation => ({
  operationId: over.operationId ?? `${over.method}${over.path}`,
  tags: over.tags ?? ['Users'],
  summary: over.summary ?? '',
  pathParams: over.pathParams ?? [],
  ...over,
});

describe('mapOperation', () => {
  it('maps collection GET to list', () => {
    expect(mapOperation(op({ method: 'get', path: '/api/users', tags: ['Users'] }))).toMatchObject({
      group: 'users',
      verb: 'list',
    });
  });

  it('maps GET by id to get', () => {
    expect(mapOperation(op({ method: 'get', path: '/api/users/{id}' }))).toMatchObject({
      group: 'users',
      verb: 'get',
    });
  });

  it('maps POST collection to create', () => {
    expect(mapOperation(op({ method: 'post', path: '/api/users' }))).toMatchObject({
      verb: 'create',
    });
  });

  it('maps revoke suffix to revoke', () => {
    expect(
      mapOperation(op({ method: 'post', path: '/api/api-keys/{id}/revoke', tags: ['API Keys'] }))
    ).toMatchObject({
      group: 'api-keys',
      verb: 'revoke',
    });
  });

  it('maps singleton GET /api/me to get', () => {
    expect(mapOperation(op({ method: 'get', path: '/api/me', tags: ['Me'] }))).toMatchObject({
      group: 'me',
      verb: 'get',
    });
  });

  it('maps nested me sessions to list-sessions', () => {
    expect(
      mapOperation(op({ method: 'get', path: '/api/me/sessions', tags: ['Me'] }))
    ).toMatchObject({
      group: 'me',
      verb: 'list-sessions',
    });
  });
});

describe('mapOperations', () => {
  it('disambiguates colliding verbs', () => {
    const mapped = mapOperations([
      op({ method: 'get', path: '/api/users', operationId: 'a', tags: ['Users'] }),
      op({ method: 'get', path: '/api/roles', operationId: 'b', tags: ['Users'] }),
    ]);
    const verbs = mapped.map((item) => item.verb);
    expect(new Set(verbs).size).toBe(verbs.length);
  });
});

describe('applyPathParams', () => {
  it('substitutes path params', () => {
    expect(applyPathParams('/api/users/{id}', { id: 'abc' })).toBe('/api/users/abc');
  });

  it('throws when a path param is missing', () => {
    expect(() => applyPathParams('/api/users/{id}', {})).toThrow(/--id/);
  });
});
