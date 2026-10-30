import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { CredentialKind, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { UserHandler } from '@/handlers/users.handler';
import { NotFoundError, ValidationError } from '@/lib/errors';

const organizationId = '10000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000042';
const memberA = '30000000-0000-4000-8000-0000000000aa';
const memberB = '30000000-0000-4000-8000-0000000000bb';
const memberC = '30000000-0000-4000-8000-0000000000cc';
const actorUserId = '40000000-0000-4000-8000-0000000000dd';
const projectScope = {
  tenant: Tenant.OrganizationProject,
  id: `${organizationId}:${projectId}`,
};
const orgScope = { tenant: Tenant.Organization, id: organizationId };

function createHandler(
  overrides: {
    members?: string[];
    isAuthorized?: ReturnType<typeof vi.fn>;
    summaries?: unknown[];
    apiKeySummaries?: unknown[];
  } = {}
) {
  const tx = { tx: true };
  const withTransaction = vi.fn(async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx));
  const members = overrides.members ?? [memberA, memberB, memberC];
  const getProjectUsers = vi.fn(async (params: { userIds?: string[] }) =>
    (params.userIds ?? []).filter((id) => members.includes(id)).map((userId) => ({ userId }))
  );
  const exportCredentials = vi.fn(async (params: { userIds: string[] }) => ({
    users: params.userIds.map((userId) => ({ userId, password: null })),
  }));
  const getPasswordCredentialSummaries = vi.fn().mockResolvedValue(overrides.summaries ?? []);
  const getApiKeyCredentialSummaries = vi.fn().mockResolvedValue(overrides.apiKeySummaries ?? []);
  const isAuthorized = overrides.isAuthorized ?? vi.fn().mockResolvedValue({ authorized: true });

  const handler = new UserHandler(
    {} as never,
    {} as never,
    {} as never,
    { getProjectUsers } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { users: { has: vi.fn().mockResolvedValue(false) } } as never,
    {} as never,
    { withTransaction } as never,
    { isAuthorized } as never,
    {} as never,
    {} as never,
    { exportCredentials, getPasswordCredentialSummaries, getApiKeyCredentialSummaries } as never,
    {} as never,
    {} as never
  );
  return {
    handler,
    tx,
    withTransaction,
    getProjectUsers,
    exportCredentials,
    getPasswordCredentialSummaries,
    getApiKeyCredentialSummaries,
    isAuthorized,
  };
}

const exportArgs = (userIds: string[], overrides: Record<string, unknown> = {}) => ({
  input: { scope: projectScope, userIds, ...overrides },
});

describe('UserHandler exportProjectUserCredentials', () => {
  it('rejects a non-project scope before any read', async () => {
    const { handler, withTransaction, exportCredentials } = createHandler();

    await expect(
      handler.exportProjectUserCredentials({
        input: { scope: orgScope, userIds: [memberA] },
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(withTransaction).not.toHaveBeenCalled();
    expect(exportCredentials).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', () => [] as string[]],
    [
      'over the page maximum',
      () =>
        Array.from(
          { length: config.system.maxPageSize + 1 },
          (_, i) => `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`
        ),
    ],
    ['not UUIDs', () => ['not-a-uuid']],
  ])('rejects userIds that are %s with a ValidationError and audits nothing', async (_l, make) => {
    const { handler, withTransaction, exportCredentials } = createHandler();

    await expect(handler.exportProjectUserCredentials(exportArgs(make()))).rejects.toBeInstanceOf(
      ValidationError
    );

    expect(withTransaction).not.toHaveBeenCalled();
    expect(exportCredentials).not.toHaveBeenCalled();
  });

  it('accepts exactly the page maximum', async () => {
    const ids = Array.from(
      { length: config.system.maxPageSize },
      (_, i) => `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    );
    const { handler, exportCredentials } = createHandler({ members: ids });

    await handler.exportProjectUserCredentials(exportArgs(ids));

    expect(exportCredentials).toHaveBeenCalledTimes(1);
  });

  it('rejects empty kinds', async () => {
    const { handler, exportCredentials } = createHandler();

    await expect(
      handler.exportProjectUserCredentials(exportArgs([memberA], { kinds: [] }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(exportCredentials).not.toHaveBeenCalled();
  });

  it('answers NotFoundError for the whole call when one id is not a member, and exports and audits nothing', async () => {
    const { handler, exportCredentials } = createHandler({ members: [memberA, memberB] });

    await expect(
      handler.exportProjectUserCredentials(exportArgs([memberA, memberB, memberC]))
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(exportCredentials).not.toHaveBeenCalled();
  });

  it('checks membership of all ids in one batched read, then exports once in the same transaction', async () => {
    const { handler, tx, withTransaction, getProjectUsers, exportCredentials } = createHandler();

    const result = await handler.exportProjectUserCredentials(exportArgs([memberC, memberA]));

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(getProjectUsers).toHaveBeenCalledTimes(1);
    expect(getProjectUsers).toHaveBeenCalledWith({ projectId, userIds: [memberC, memberA] }, tx);
    expect(exportCredentials).toHaveBeenCalledTimes(1);
    expect(exportCredentials).toHaveBeenCalledWith(
      { projectId, userIds: [memberC, memberA], kinds: [CredentialKind.Password] },
      tx
    );
    expect(result.users.map((user) => user.userId)).toEqual([memberC, memberA]);
  });

  it('lowercases ids and drops duplicates, keeping first-seen order', async () => {
    const { handler, exportCredentials } = createHandler();

    await handler.exportProjectUserCredentials(
      exportArgs([memberB.toUpperCase(), memberA, memberB])
    );

    expect(exportCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [memberB, memberA] }),
      expect.anything()
    );
  });

  it('does not re-check roles in the handler (the transport owns authorization)', async () => {
    const { handler, isAuthorized } = createHandler();

    await handler.exportProjectUserCredentials(exportArgs([memberA]));

    expect(isAuthorized).not.toHaveBeenCalled();
  });
});

describe('UserHandler getProjectUserPasswordCredential (User.passwordCredential)', () => {
  const summary = {
    userId: memberA,
    source: 'admin-set',
    updatedAt: new Date('2026-10-28T10:00:00Z'),
    fingerprint: 'a'.repeat(64),
  };

  it('is null without ProjectUser:ExportCredentials, and reads nothing', async () => {
    const { handler, getPasswordCredentialSummaries } = createHandler({
      isAuthorized: vi.fn().mockResolvedValue({ authorized: false, reason: 'no permission' }),
      summaries: [summary],
    });

    await expect(
      handler.getProjectUserPasswordCredential({
        userId: memberA,
        scope: projectScope,
        actorUserId,
      })
    ).resolves.toBeNull();
    expect(getPasswordCredentialSummaries).not.toHaveBeenCalled();
  });

  it('is null for a non-project scope, with no permission check and no read', async () => {
    const { handler, isAuthorized, getPasswordCredentialSummaries } = createHandler({
      summaries: [summary],
    });

    await expect(
      handler.getProjectUserPasswordCredential({
        userId: memberA,
        scope: orgScope,
        actorUserId,
      })
    ).resolves.toBeNull();
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(getPasswordCredentialSummaries).not.toHaveBeenCalled();
  });

  it.each([Tenant.OrganizationProjectUser, Tenant.AccountProjectUser])(
    'is null for the leaf %s scope (it embeds a project id but is not a project scope), with no permission check',
    async (tenant) => {
      const { handler, isAuthorized, getPasswordCredentialSummaries } = createHandler({
        summaries: [summary],
      });

      await expect(
        handler.getProjectUserPasswordCredential({
          userId: memberA,
          scope: { tenant, id: `${organizationId}:${projectId}:${memberA}` },
          actorUserId,
        })
      ).resolves.toBeNull();
      expect(isAuthorized).not.toHaveBeenCalled();
      expect(getPasswordCredentialSummaries).not.toHaveBeenCalled();
    }
  );

  it('is { source, updatedAt, fingerprint } in an AccountProject scope too', async () => {
    const { handler, getPasswordCredentialSummaries } = createHandler({ summaries: [summary] });

    await expect(
      handler.getProjectUserPasswordCredential({
        userId: memberA,
        scope: { tenant: Tenant.AccountProject, id: `${organizationId}:${projectId}` },
        actorUserId,
      })
    ).resolves.toMatchObject({ source: 'admin-set' });
    expect(getPasswordCredentialSummaries).toHaveBeenCalledWith(
      { projectId, userIds: [memberA] },
      expect.anything()
    );
  });

  it('is null for an unauthenticated caller', async () => {
    const { handler, isAuthorized } = createHandler({ summaries: [summary] });

    await expect(
      handler.getProjectUserPasswordCredential({
        userId: memberA,
        scope: projectScope,
        actorUserId: undefined,
      })
    ).resolves.toBeNull();
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it('is { source, updatedAt, fingerprint } for a holder, and checks the export permission', async () => {
    const { handler, isAuthorized, getPasswordCredentialSummaries, tx } = createHandler({
      summaries: [summary],
    });

    const value = await handler.getProjectUserPasswordCredential({
      userId: memberA,
      scope: projectScope,
      actorUserId,
    });

    expect(value).toEqual({
      source: 'admin-set',
      updatedAt: summary.updatedAt,
      fingerprint: summary.fingerprint,
    });
    expect(isAuthorized).toHaveBeenCalledWith(
      {
        permission: {
          resource: ResourceSlug.ProjectUser,
          action: ResourceAction.ExportCredentials,
        },
        context: {},
      },
      actorUserId
    );
    expect(getPasswordCredentialSummaries).toHaveBeenCalledWith(
      { projectId, userIds: [memberA] },
      tx
    );
  });

  it('is null for a holder when the member has no project credential', async () => {
    const { handler } = createHandler({ summaries: [] });

    await expect(
      handler.getProjectUserPasswordCredential({
        userId: memberA,
        scope: projectScope,
        actorUserId,
      })
    ).resolves.toBeNull();
  });
});

describe('UserHandler getProjectUserApiKeyCredentials (User.apiKeyCredentials)', () => {
  const entry = {
    apiKeyId: '50000000-0000-4000-8000-000000000001',
    clientId: '50000000-0000-4000-8000-000000000002',
    fingerprint: 'b'.repeat(64),
    exportable: true,
    updatedAt: new Date('2026-10-30T10:00:00Z'),
  };
  const legacy = { ...entry, apiKeyId: '50000000-0000-4000-8000-000000000003', fingerprint: null };

  it('is null without ProjectUser:ExportCredentials, and reads nothing', async () => {
    const { handler, getApiKeyCredentialSummaries } = createHandler({
      isAuthorized: vi.fn().mockResolvedValue({ authorized: false, reason: 'no permission' }),
      apiKeySummaries: [entry],
    });

    await expect(
      handler.getProjectUserApiKeyCredentials({ userId: memberA, scope: projectScope, actorUserId })
    ).resolves.toBeNull();
    expect(getApiKeyCredentialSummaries).not.toHaveBeenCalled();
  });

  it('is null for a non-project scope, with no permission check and no read', async () => {
    const { handler, isAuthorized, getApiKeyCredentialSummaries } = createHandler({
      apiKeySummaries: [entry],
    });

    await expect(
      handler.getProjectUserApiKeyCredentials({ userId: memberA, scope: orgScope, actorUserId })
    ).resolves.toBeNull();
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(getApiKeyCredentialSummaries).not.toHaveBeenCalled();
  });

  it.each([Tenant.OrganizationProjectUser, Tenant.AccountProjectUser])(
    'is null for the leaf %s scope, with no permission check',
    async (tenant) => {
      const { handler, isAuthorized, getApiKeyCredentialSummaries } = createHandler({
        apiKeySummaries: [entry],
      });

      await expect(
        handler.getProjectUserApiKeyCredentials({
          userId: memberA,
          scope: { tenant, id: `${organizationId}:${projectId}:${memberA}` },
          actorUserId,
        })
      ).resolves.toBeNull();
      expect(isAuthorized).not.toHaveBeenCalled();
      expect(getApiKeyCredentialSummaries).not.toHaveBeenCalled();
    }
  );

  it('is null for an unauthenticated caller', async () => {
    const { handler, isAuthorized } = createHandler({ apiKeySummaries: [entry] });

    await expect(
      handler.getProjectUserApiKeyCredentials({
        userId: memberA,
        scope: projectScope,
        actorUserId: undefined,
      })
    ).resolves.toBeNull();
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it('for a holder: one entry per key, a null fingerprint for a legacy key, and checks the export permission', async () => {
    const { handler, isAuthorized, getApiKeyCredentialSummaries, tx } = createHandler({
      apiKeySummaries: [entry, legacy],
    });

    const value = await handler.getProjectUserApiKeyCredentials({
      userId: memberA,
      scope: projectScope,
      actorUserId,
    });

    expect(value).toEqual([entry, legacy]);
    expect(isAuthorized).toHaveBeenCalledWith(
      {
        permission: {
          resource: ResourceSlug.ProjectUser,
          action: ResourceAction.ExportCredentials,
        },
        context: {},
      },
      actorUserId
    );
    expect(getApiKeyCredentialSummaries).toHaveBeenCalledWith({ projectId, userId: memberA }, tx);
  });

  it('is an empty list for a holder when the member has no key', async () => {
    const { handler } = createHandler({ apiKeySummaries: [] });

    await expect(
      handler.getProjectUserApiKeyCredentials({ userId: memberA, scope: projectScope, actorUserId })
    ).resolves.toEqual([]);
  });

  it('works in an AccountProject scope too', async () => {
    const { handler, getApiKeyCredentialSummaries } = createHandler({ apiKeySummaries: [entry] });

    await handler.getProjectUserApiKeyCredentials({
      userId: memberA,
      scope: { tenant: Tenant.AccountProject, id: `${organizationId}:${projectId}` },
      actorUserId,
    });
    expect(getApiKeyCredentialSummaries).toHaveBeenCalledWith(
      { projectId, userId: memberA },
      expect.anything()
    );
  });
});
