import { describe, expect, it, vi } from 'vitest';

import { schema } from '@/graphql/resolvers';
import { projectUserPasswordCredentialResolver } from '@/graphql/resolvers/project-users/fields/password-credential.resolver';

type FieldFn = (
  parent: unknown,
  args: unknown,
  context: unknown,
  info: unknown
) => Promise<unknown>;
const callField = projectUserPasswordCredentialResolver as unknown as FieldFn;

describe('ProjectUser credential resolvers', () => {
  it('registers the export query and the passwordCredential field on the executable schema', () => {
    const query = schema.getQueryType()!.getFields().exportProjectUserCredentials;
    expect(query).toBeDefined();
    expect(typeof query.resolve).toBe('function');

    const field = (
      schema.getType('ProjectUser') as { getFields(): Record<string, { resolve?: unknown }> }
    ).getFields().passwordCredential;
    expect(field).toBeDefined();
    expect(typeof field.resolve).toBe('function');
  });

  it('passwordCredential delegates to the handler with the parent ids and the caller', async () => {
    const getProjectUserPasswordCredential = vi.fn().mockResolvedValue(null);
    const context = {
      handlers: { users: { getProjectUserPasswordCredential } },
      user: { userId: 'caller-1' },
    };

    const value = await callField({ projectId: 'project-1', userId: 'user-1' }, {}, context, {});

    expect(value).toBeNull();
    expect(getProjectUserPasswordCredential).toHaveBeenCalledWith({
      projectId: 'project-1',
      userId: 'user-1',
      actorUserId: 'caller-1',
    });
  });

  it('passwordCredential passes no caller when the request is unauthenticated', async () => {
    const getProjectUserPasswordCredential = vi.fn().mockResolvedValue(null);

    await callField(
      { projectId: 'project-1', userId: 'user-1' },
      {},
      { handlers: { users: { getProjectUserPasswordCredential } }, user: null },
      {}
    );

    expect(getProjectUserPasswordCredential).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: undefined })
    );
  });
});
