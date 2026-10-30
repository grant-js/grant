import { describe, expect, it, vi } from 'vitest';

import { schema } from '@/graphql/resolvers';
import { userApiKeyCredentialsResolver } from '@/graphql/resolvers/users/fields/api-key-credentials.resolver';

type FieldFn = (
  parent: unknown,
  args: unknown,
  context: unknown,
  info: unknown
) => Promise<unknown>;
const callField = userApiKeyCredentialsResolver as unknown as FieldFn;

describe('User.apiKeyCredentials resolver', () => {
  it('is registered on the executable schema as a nullable list of entries with a nullable fingerprint', () => {
    const field = (
      schema.getType('User') as {
        getFields(): Record<string, { resolve?: unknown; type: { toString(): string } }>;
      }
    ).getFields().apiKeyCredentials;
    expect(field).toBeDefined();
    expect(typeof field.resolve).toBe('function');
    expect(field.type.toString()).toBe('[ProjectUserApiKeyCredential!]');

    const entry = (
      schema.getType('ProjectUserApiKeyCredential') as {
        getFields(): Record<string, { type: { toString(): string } }>;
      }
    ).getFields();
    expect(Object.keys(entry).sort()).toEqual([
      'apiKeyId',
      'clientId',
      'exportable',
      'fingerprint',
      'updatedAt',
    ]);
    expect(entry.fingerprint.type.toString()).toBe('String');
    expect(entry.exportable.type.toString()).toBe('Boolean!');
  });

  it('delegates to the handler with the parent user, the request scope and the caller', async () => {
    const getProjectUserApiKeyCredentials = vi.fn().mockResolvedValue([]);
    const scope = { tenant: 'organizationProject', id: 'org-1:project-1' };
    const context = {
      handlers: { users: { getProjectUserApiKeyCredentials } },
      user: { userId: 'caller-1', scope },
    };

    const value = await callField({ id: 'user-1' }, {}, context, {});

    expect(value).toEqual([]);
    expect(getProjectUserApiKeyCredentials).toHaveBeenCalledWith({
      userId: 'user-1',
      scope,
      actorUserId: 'caller-1',
    });
  });

  it('is null, and reads nothing, when the request has no scope', async () => {
    const getProjectUserApiKeyCredentials = vi.fn();

    const value = await callField(
      { id: 'user-1' },
      {},
      {
        handlers: { users: { getProjectUserApiKeyCredentials } },
        user: { userId: 'caller-1' },
      },
      {}
    );

    expect(value).toBeNull();
    expect(getProjectUserApiKeyCredentials).not.toHaveBeenCalled();
  });
});
