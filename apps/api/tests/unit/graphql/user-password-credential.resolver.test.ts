import { describe, expect, it, vi } from 'vitest';

import { schema } from '@/graphql/resolvers';
import { userPasswordCredentialResolver } from '@/graphql/resolvers/users/fields/password-credential.resolver';

type FieldFn = (
  parent: unknown,
  args: unknown,
  context: unknown,
  info: unknown
) => Promise<unknown>;
const callField = userPasswordCredentialResolver as unknown as FieldFn;

describe('User.passwordCredential and credential export resolvers', () => {
  it('registers the export query and the passwordCredential field on the executable schema', () => {
    const query = schema.getQueryType()!.getFields().exportProjectUserCredentials;
    expect(query).toBeDefined();
    expect(typeof query.resolve).toBe('function');

    const field = (
      schema.getType('User') as { getFields(): Record<string, { resolve?: unknown }> }
    ).getFields().passwordCredential;
    expect(field).toBeDefined();
    expect(typeof field.resolve).toBe('function');
  });

  it('passwordCredential delegates to the handler with the parent user, the request scope and the caller', async () => {
    const getProjectUserPasswordCredential = vi.fn().mockResolvedValue(null);
    const scope = { tenant: 'organizationProject', id: 'org-1:project-1' };
    const context = {
      handlers: { users: { getProjectUserPasswordCredential } },
      user: { userId: 'caller-1', scope },
    };

    const value = await callField({ id: 'user-1' }, {}, context, {});

    expect(value).toBeNull();
    expect(getProjectUserPasswordCredential).toHaveBeenCalledWith({
      userId: 'user-1',
      scope,
      actorUserId: 'caller-1',
    });
  });

  it('passwordCredential is null, and reads nothing, when the request has no scope', async () => {
    const getProjectUserPasswordCredential = vi.fn();

    const value = await callField(
      { id: 'user-1' },
      {},
      {
        handlers: { users: { getProjectUserPasswordCredential } },
        user: { userId: 'caller-1' },
      },
      {}
    );

    expect(value).toBeNull();
    expect(getProjectUserPasswordCredential).not.toHaveBeenCalled();
  });
});
