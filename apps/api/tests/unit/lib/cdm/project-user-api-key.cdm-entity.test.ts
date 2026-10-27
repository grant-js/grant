import type { CdmApplyContext, CdmExportContext, CdmTeardownContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import { ProjectUserApiKeyCdmEntity } from '@/lib/cdm/entities/project-user-api-key.cdm-entity';
import { buildExternalKey } from '@/lib/cdm/identity.lib';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const apiKeyId = '40000000-0000-4000-8000-000000000001';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

const BYOK_SECRET = 'x'.repeat(32);

function baseResult(): SyncProjectResult {
  return {
    projectId,
    importId: null,
    rolesCreated: 0,
    groupsCreated: 0,
    roleGroupsLinked: 0,
    groupPermissionsLinked: 0,
    projectRolesLinked: 0,
    projectGroupsLinked: 0,
    projectPermissionsLinked: 0,
    projectResourcesLinked: 0,
    projectUsersEnsured: 0,
    usersCreated: 0,
    userRolesAssigned: 0,
    projectUserApiKeysCreated: 0,
    passwordsImported: 0,
    passwordsUpdated: 0,
    passwordsUnchanged: 0,
    passwordsSkippedExisting: 0,
    tagsCreated: 0,
    projectTagsLinked: 0,
    roleTagsLinked: 0,
    groupTagsLinked: 0,
    userTagsLinked: 0,
    resourcesCreated: 0,
    permissionsCreated: 0,
    warnings: [],
  };
}

function buildHandler(deps?: {
  importRepo?: { listCdmProjectUserApiKeyIdsForProject: ReturnType<typeof vi.fn> };
  exportRepo?: {
    getProjectUserApiKeysForCdmExport: ReturnType<typeof vi.fn>;
    getProjectUserApiKeyExportIdentities: ReturnType<typeof vi.fn>;
    getProjectCdmProvisionedUsers: ReturnType<typeof vi.fn>;
  };
  apiKeys?: {
    createApiKeysForCdmImport: ReturnType<typeof vi.fn>;
    deleteApiKeysForCdmImport: ReturnType<typeof vi.fn>;
  };
  projectUserApiKeys?: { addProjectUserApiKeysForCdmImport: ReturnType<typeof vi.fn> };
}) {
  const importRepo = deps?.importRepo ?? {
    listCdmProjectUserApiKeyIdsForProject: vi.fn().mockResolvedValue([]),
  };
  const exportRepo = deps?.exportRepo ?? {
    getProjectUserApiKeysForCdmExport: vi.fn().mockResolvedValue([]),
    getProjectUserApiKeyExportIdentities: vi.fn().mockResolvedValue(new Map()),
    getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
  };
  const apiKeys = deps?.apiKeys ?? {
    createApiKeysForCdmImport: vi.fn(),
    deleteApiKeysForCdmImport: vi.fn(),
  };
  const projectUserApiKeys = deps?.projectUserApiKeys ?? {
    addProjectUserApiKeysForCdmImport: vi.fn(),
  };
  return {
    handler: new ProjectUserApiKeyCdmEntity(
      importRepo as never,
      exportRepo as never,
      apiKeys as never,
      projectUserApiKeys as never
    ),
    importRepo,
    exportRepo,
    apiKeys,
    projectUserApiKeys,
  };
}

describe('ProjectUserApiKeyCdmEntity', () => {
  it('validateInput rejects duplicate externalKey', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([
        {
          userId,
          externalKey: 'k1',
          clientSecret: BYOK_SECRET,
        },
        {
          userId,
          externalKey: 'k1',
          clientSecret: BYOK_SECRET,
        },
      ])
    ).toThrow(/Duplicate projectUserApiKeys externalKey/);
  });

  it('validateInput rejects missing clientSecret', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([
        {
          userId,
          clientSecret: '',
        },
      ])
    ).toThrow(/clientSecret is required/);
  });

  it('validateInput rejects short clientSecret', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([
        {
          userId,
          clientSecret: 'short',
        },
      ])
    ).toThrow();
  });

  it('teardown hard-deletes CDM api keys in one call', async () => {
    const apiKeyIds = [
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
    ];
    const listCdmProjectUserApiKeyIdsForProject = vi.fn().mockResolvedValue(apiKeyIds);
    const deleteApiKeysForCdmImport = vi.fn().mockResolvedValue(undefined);
    const { handler } = buildHandler({
      importRepo: { listCdmProjectUserApiKeyIdsForProject },
      apiKeys: {
        createApiKeysForCdmImport: vi.fn(),
        deleteApiKeysForCdmImport,
      },
    });

    const ctx: CdmTeardownContext = { projectId, scope, tx: {} };
    await handler.teardown(ctx);

    expect(deleteApiKeysForCdmImport).toHaveBeenCalledTimes(1);
    expect(deleteApiKeysForCdmImport).toHaveBeenCalledWith({ ids: apiKeyIds }, ctx.tx);
  });

  it('apply rejects userId not in assignmentUserIds', async () => {
    const { handler } = buildHandler();
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: {},
      lookupResolvedRef: () => ({}),
      result: baseResult(),
      produced: {
        roleIdsByKey: new Map(),
        tagIds: new Map(),
        resourceIds: new Map(),
        permissionIds: new Map(),
        userIds: new Map(),
        groupIdsByKey: new Map(),
      },
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set<string>(),
    };

    await expect(
      handler.apply(ctx, [
        {
          userId,
          clientSecret: BYOK_SECRET,
        },
      ])
    ).rejects.toThrow(/not part of this import's user assignments/);
  });

  it('apply creates api key, pivot with CDM metadata, and increments counter', async () => {
    const createdKey = { id: '50000000-0000-4000-8000-000000000077', clientId: 'cid-1' };
    const createApiKeysForCdmImport = vi.fn().mockResolvedValue([createdKey]);
    const addProjectUserApiKeysForCdmImport = vi.fn().mockResolvedValue([]);
    const { handler } = buildHandler({
      apiKeys: {
        createApiKeysForCdmImport,
        deleteApiKeysForCdmImport: vi.fn(),
      },
      projectUserApiKeys: { addProjectUserApiKeysForCdmImport },
    });

    const result = baseResult();
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: { __tx: true },
      lookupResolvedRef: () => ({}),
      result,
      produced: {
        roleIdsByKey: new Map(),
        tagIds: new Map(),
        resourceIds: new Map(),
        permissionIds: new Map(),
        userIds: new Map(),
        groupIdsByKey: new Map(),
      },
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set([userId]),
    };

    await handler.apply(ctx, [
      {
        userId,
        externalKey: 'ext-1',
        clientSecret: BYOK_SECRET,
        name: 'Bot',
        metadata: { legacyKey: 'L1' },
      },
    ]);

    expect(result.projectUserApiKeysCreated).toBe(1);
    expect(createApiKeysForCdmImport).toHaveBeenCalledTimes(1);
    expect(createApiKeysForCdmImport).toHaveBeenCalledWith(
      {
        keys: [
          expect.objectContaining({
            clientSecretHash: expect.stringMatching(/^\$2[aby]\$/),
            name: 'Bot',
          }),
        ],
      },
      ctx.tx
    );
    const createdArgs = createApiKeysForCdmImport.mock.calls[0][0] as {
      keys: Array<{ clientSecretHash: string }>;
    };
    expect(createdArgs.keys[0]?.clientSecretHash).not.toBe(BYOK_SECRET);
    expect(addProjectUserApiKeysForCdmImport).toHaveBeenCalledWith(
      {
        links: [
          expect.objectContaining({
            projectId,
            userId,
            apiKeyId: createdKey.id,
            metadata: expect.objectContaining({
              [CDM_IMPORT_METADATA_KEY]: expect.objectContaining({
                projectId,
                kind: 'projectUserApiKey',
                externalKey: 'ext-1',
              }),
              cdmSource: { legacyKey: 'L1' },
            }),
          }),
        ],
      },
      ctx.tx
    );
  });

  it('propagates a mid-batch pivot throw on the same import transaction', async () => {
    const createApiKeysForCdmImport = vi
      .fn()
      .mockResolvedValue([{ id: '50000000-0000-4000-8000-000000000077', clientId: 'cid-1' }]);
    const addProjectUserApiKeysForCdmImport = vi.fn().mockRejectedValue(new Error('constraint'));
    const { handler } = buildHandler({
      apiKeys: {
        createApiKeysForCdmImport,
        deleteApiKeysForCdmImport: vi.fn(),
      },
      projectUserApiKeys: { addProjectUserApiKeysForCdmImport },
    });
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: { __tx: true },
      lookupResolvedRef: () => ({}),
      result: baseResult(),
      produced: {
        roleIdsByKey: new Map(),
        tagIds: new Map(),
        resourceIds: new Map(),
        permissionIds: new Map(),
        userIds: new Map(),
        groupIdsByKey: new Map(),
      },
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set([userId]),
    };

    await expect(handler.apply(ctx, [{ userId, clientSecret: BYOK_SECRET }])).rejects.toThrow(
      'constraint'
    );
    expect(createApiKeysForCdmImport).toHaveBeenCalledWith(expect.anything(), ctx.tx);
    expect(addProjectUserApiKeysForCdmImport).toHaveBeenCalledWith(expect.anything(), ctx.tx);
  });

  it('export maps rows without secrets', async () => {
    const expires = new Date('2027-01-15T00:00:00.000Z');
    const getProjectUserApiKeysForCdmExport = vi.fn().mockResolvedValue([
      {
        apiKeyId,
        userId,
        clientId: 'client-id-1',
        name: 'Key A',
        description: 'd',
        expiresAt: expires,
        pivotMetadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId,
            kind: 'projectUserApiKey',
            externalKey: 'ext-1',
          },
          cdmSource: { x: 1 },
        },
      },
    ]);
    const { handler, exportRepo } = buildHandler({
      exportRepo: {
        getProjectUserApiKeysForCdmExport,
        getProjectUserApiKeyExportIdentities: vi.fn().mockResolvedValue(new Map()),
        getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
      },
    });

    const ctx: CdmExportContext = { projectId, scope };
    const out = await handler.export(ctx);

    expect(exportRepo.getProjectUserApiKeysForCdmExport).toHaveBeenCalledWith(projectId, undefined);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(
      expect.objectContaining({
        userId,
        clientId: 'client-id-1',
        name: 'Key A',
        description: 'd',
        externalKey: 'ext-1',
        expiresAt: expires,
        metadata: { x: 1 },
      })
    );
    expect(out[0]).not.toHaveProperty('clientSecret');
  });

  it('export derives externalKey from export identity when cdmImport key is absent', async () => {
    const getProjectUserApiKeysForCdmExport = vi.fn().mockResolvedValue([
      {
        apiKeyId,
        userId,
        clientId: 'client-id-1',
        name: 'Key A',
        description: null,
        expiresAt: null,
        pivotMetadata: {},
      },
    ]);
    const getProjectUserApiKeyExportIdentities = vi
      .fn()
      .mockResolvedValue(new Map([[apiKeyId, { clientId: 'client-id-1', userId }]]));
    const { handler, exportRepo } = buildHandler({
      exportRepo: {
        getProjectUserApiKeysForCdmExport,
        getProjectUserApiKeyExportIdentities,
        getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
      },
    });

    const out = await handler.export({ projectId, scope });

    expect(exportRepo.getProjectUserApiKeyExportIdentities).toHaveBeenCalledWith(
      projectId,
      [apiKeyId],
      undefined
    );
    expect(out[0]?.externalKey).toBe(buildExternalKey('apikey', 'client-id-1', userId));
  });
});
