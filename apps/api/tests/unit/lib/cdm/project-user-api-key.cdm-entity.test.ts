import { createHash } from 'node:crypto';

import type { CdmApplyContext, CdmExportContext, CdmTeardownContext } from '@grantjs/core';
import { CdmModeStrategy, Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import { fingerprintCdmApiKeySecret } from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import { ProjectUserApiKeyCdmEntity } from '@/lib/cdm/entities/project-user-api-key.cdm-entity';
import { buildExternalKey } from '@/lib/cdm/identity.lib';
import * as tokenLib from '@/lib/token.lib';

vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config')>();
  return {
    ...actual,
    config: {
      ...actual.config,
      cdm: {
        ...actual.config.cdm,
        apiKeyFingerprintHmacSecret: 'unit-test-cdm-api-key-fingerprint',
      },
    },
  };
});

const HMAC = 'unit-test-cdm-api-key-fingerprint';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const apiKeyId = '40000000-0000-4000-8000-000000000001';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

const BYOK_SECRET = 'x'.repeat(32);
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

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
    projectUserApiKeysUnchanged: 0,
    projectUserApiKeysRotated: 0,
    projectUserApiKeysDeleted: 0,
    passwordsImported: 0,
    passwordsUpdated: 0,
    passwordsUnchanged: 0,
    passwordsSkippedExisting: 0,
    usersSkippedTombstoned: 0,
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
  importRepo?: {
    listCdmProjectUserApiKeyIdsForProject?: ReturnType<typeof vi.fn>;
    listCdmProjectUserApiKeysForReplace?: ReturnType<typeof vi.fn>;
    updateCdmProjectUserApiKeyMetadata?: ReturnType<typeof vi.fn>;
  };
  exportRepo?: {
    getProjectUserApiKeysForCdmExport: ReturnType<typeof vi.fn>;
    getProjectUserApiKeyExportIdentities: ReturnType<typeof vi.fn>;
    getProjectCdmProvisionedUsers: ReturnType<typeof vi.fn>;
  };
  apiKeys?: {
    createApiKeysForCdmImport: ReturnType<typeof vi.fn>;
    deleteApiKeysForCdmImport: ReturnType<typeof vi.fn>;
    rotateApiKeysForCdmImport?: ReturnType<typeof vi.fn>;
    setMissingClientSecretFingerprintsForCdmImport?: ReturnType<typeof vi.fn>;
  };
  projectUserApiKeys?: { addProjectUserApiKeysForCdmImport: ReturnType<typeof vi.fn> };
}) {
  const importRepo = {
    listCdmProjectUserApiKeyIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmProjectUserApiKeysForReplace: vi.fn().mockResolvedValue([]),
    updateCdmProjectUserApiKeyMetadata: vi.fn().mockResolvedValue(undefined),
    ...deps?.importRepo,
  };
  const exportRepo = deps?.exportRepo ?? {
    getProjectUserApiKeysForCdmExport: vi.fn().mockResolvedValue([]),
    getProjectUserApiKeyExportIdentities: vi.fn().mockResolvedValue(new Map()),
    getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
  };
  const apiKeys = {
    createApiKeysForCdmImport: vi.fn(),
    deleteApiKeysForCdmImport: vi.fn(),
    rotateApiKeysForCdmImport: vi.fn().mockResolvedValue(undefined),
    setMissingClientSecretFingerprintsForCdmImport: vi.fn().mockResolvedValue(undefined),
    ...deps?.apiKeys,
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

  it('teardown is a no-op so apply can keep unchanged keys', async () => {
    const deleteApiKeysForCdmImport = vi.fn().mockResolvedValue(undefined);
    const { handler, importRepo } = buildHandler({
      apiKeys: {
        createApiKeysForCdmImport: vi.fn(),
        deleteApiKeysForCdmImport,
      },
    });

    const ctx: CdmTeardownContext = { projectId, scope, tx: {} };
    await handler.teardown(ctx);

    expect(deleteApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(importRepo.listCdmProjectUserApiKeyIdsForProject).not.toHaveBeenCalled();
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
      skippedUserKeys: new Set<string>(),
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

  it('apply drops the keys of a user the provision step skipped (deletion tombstone), silently', async () => {
    const createApiKeysForCdmImport = vi.fn().mockResolvedValue([]);
    const { handler } = buildHandler({
      apiKeys: { createApiKeysForCdmImport, deleteApiKeysForCdmImport: vi.fn() },
    });
    const result = baseResult();
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: {},
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
      assignmentUserIds: new Set<string>(),
      skippedUserKeys: new Set(['skipped-user-key']),
    };

    await expect(
      handler.apply(ctx, [
        { userKey: 'skipped-user-key', externalKey: 'ext-1', clientSecret: BYOK_SECRET },
      ])
    ).resolves.toBeUndefined();

    expect(createApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(result.projectUserApiKeysCreated).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('apply still refuses a key whose user is neither produced nor skipped', async () => {
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
      skippedUserKeys: new Set(['another-key']),
    };

    await expect(
      handler.apply(ctx, [{ userKey: 'never-provisioned', clientSecret: BYOK_SECRET }])
    ).rejects.toThrow(/unresolved userKey/);
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
      skippedUserKeys: new Set<string>(),
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
      skippedUserKeys: new Set<string>(),
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

  it('export omits cdmImport secretFingerprint', async () => {
    const getProjectUserApiKeysForCdmExport = vi.fn().mockResolvedValue([
      {
        apiKeyId,
        userId,
        clientId: 'client-id-1',
        name: 'Key A',
        description: null,
        expiresAt: null,
        pivotMetadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId,
            kind: 'projectUserApiKey',
            externalKey: 'ext-1',
            secretFingerprint: 'should-never-export',
          },
          cdmSource: { legacy: 1 },
        },
      },
    ]);
    const { handler } = buildHandler({
      exportRepo: {
        getProjectUserApiKeysForCdmExport,
        getProjectUserApiKeyExportIdentities: vi.fn().mockResolvedValue(new Map()),
        getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
      },
    });

    const out = await handler.export({ projectId, scope });
    expect(JSON.stringify(out)).not.toContain('should-never-export');
    expect(JSON.stringify(out)).not.toContain('secretFingerprint');
    expect(out[0]?.metadata).toEqual({ legacy: 1 });
  });

  it('replace keep skips bcrypt and preserves the existing key', async () => {
    const hashSpy = vi.spyOn(tokenLib, 'hashSecretAsync');
    const listCdmProjectUserApiKeysForReplace = vi.fn().mockResolvedValue([
      {
        apiKeyId,
        userId,
        clientId: 'cid-1',
        externalKey: 'ext-1',
        secretFingerprint: fingerprintCdmApiKeySecret(BYOK_SECRET, HMAC),
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId,
            kind: 'projectUserApiKey',
            externalKey: 'ext-1',
            secretFingerprint: fingerprintCdmApiKeySecret(BYOK_SECRET, HMAC),
          },
        },
      },
    ]);
    const createApiKeysForCdmImport = vi.fn();
    const deleteApiKeysForCdmImport = vi.fn();
    const rotateApiKeysForCdmImport = vi.fn();
    const { handler } = buildHandler({
      importRepo: { listCdmProjectUserApiKeysForReplace },
      apiKeys: {
        createApiKeysForCdmImport,
        deleteApiKeysForCdmImport,
        rotateApiKeysForCdmImport,
      },
    });
    const result = baseResult();
    const ctx = applyCtx(result, CdmModeStrategy.Replace);

    await handler.apply(ctx, [{ userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET }]);

    expect(result.projectUserApiKeysCreated).toBe(0);
    expect(result.projectUserApiKeysUnchanged).toBe(1);
    expect(result.projectUserApiKeysRotated).toBe(0);
    expect(result.projectUserApiKeysDeleted).toBe(0);
    expect(createApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(rotateApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(deleteApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(hashSpy).not.toHaveBeenCalled();
    hashSpy.mockRestore();
  });

  it('replace rotate with a missing fingerprint hashes one secret and keeps the id', async () => {
    const hashSpy = vi.spyOn(tokenLib, 'hashSecretAsync');
    const listCdmProjectUserApiKeysForReplace = vi.fn().mockResolvedValue([
      {
        apiKeyId,
        userId,
        clientId: 'cid-1',
        externalKey: 'ext-1',
        secretFingerprint: null,
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId,
            kind: 'projectUserApiKey',
            externalKey: 'ext-1',
          },
        },
      },
    ]);
    const rotateApiKeysForCdmImport = vi.fn().mockResolvedValue(undefined);
    const createApiKeysForCdmImport = vi.fn();
    const { handler, importRepo } = buildHandler({
      importRepo: { listCdmProjectUserApiKeysForReplace },
      apiKeys: {
        createApiKeysForCdmImport,
        deleteApiKeysForCdmImport: vi.fn(),
        rotateApiKeysForCdmImport,
      },
    });
    const result = baseResult();
    const ctx = applyCtx(result, CdmModeStrategy.Replace);

    await handler.apply(ctx, [{ userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET }]);

    expect(result.projectUserApiKeysRotated).toBe(1);
    expect(result.projectUserApiKeysCreated).toBe(0);
    expect(createApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(rotateApiKeysForCdmImport).toHaveBeenCalledWith(
      {
        keys: [
          {
            id: apiKeyId,
            clientSecretHash: expect.stringMatching(/^\$2[aby]\$/),
            clientSecretFingerprint: sha256(BYOK_SECRET),
          },
        ],
      },
      ctx.tx
    );
    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(importRepo.updateCdmProjectUserApiKeyMetadata).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          apiKeyId,
          projectId,
          metadata: expect.objectContaining({
            [CDM_IMPORT_METADATA_KEY]: expect.objectContaining({
              secretFingerprint: fingerprintCdmApiKeySecret(BYOK_SECRET, HMAC),
            }),
          }),
        }),
      ],
      ctx.tx
    );
    hashSpy.mockRestore();
  });

  it('replace deletes missing externalKeys and creates new ones', async () => {
    const listCdmProjectUserApiKeysForReplace = vi.fn().mockResolvedValue([
      {
        apiKeyId,
        userId,
        clientId: 'cid-old',
        externalKey: 'old-key',
        secretFingerprint: 'abc',
        metadata: {},
      },
    ]);
    const createApiKeysForCdmImport = vi
      .fn()
      .mockResolvedValue([{ id: '50000000-0000-4000-8000-000000000077', clientId: 'cid-new' }]);
    const deleteApiKeysForCdmImport = vi.fn().mockResolvedValue(undefined);
    const { handler } = buildHandler({
      importRepo: { listCdmProjectUserApiKeysForReplace },
      apiKeys: {
        createApiKeysForCdmImport,
        deleteApiKeysForCdmImport,
        rotateApiKeysForCdmImport: vi.fn(),
      },
      projectUserApiKeys: { addProjectUserApiKeysForCdmImport: vi.fn().mockResolvedValue([]) },
    });
    const result = baseResult();
    const ctx = applyCtx(result, CdmModeStrategy.Replace);

    await handler.apply(ctx, [{ userId, externalKey: 'new-key', clientSecret: BYOK_SECRET }]);

    expect(deleteApiKeysForCdmImport).toHaveBeenCalledWith({ ids: [apiKeyId] }, ctx.tx);
    expect(createApiKeysForCdmImport).toHaveBeenCalledTimes(1);
    expect(result.projectUserApiKeysDeleted).toBe(1);
    expect(result.projectUserApiKeysCreated).toBe(1);
    expect(result.projectUserApiKeysUnchanged).toBe(0);
  });

  it('merge still creates even when an existing fingerprint would match', async () => {
    const createApiKeysForCdmImport = vi
      .fn()
      .mockResolvedValue([{ id: '50000000-0000-4000-8000-000000000077', clientId: 'cid-1' }]);
    const { handler, importRepo } = buildHandler({
      apiKeys: {
        createApiKeysForCdmImport,
        deleteApiKeysForCdmImport: vi.fn(),
      },
      projectUserApiKeys: { addProjectUserApiKeysForCdmImport: vi.fn().mockResolvedValue([]) },
    });
    const result = baseResult();
    const ctx = applyCtx(result, CdmModeStrategy.Merge);

    await handler.apply(ctx, [{ userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET }]);

    expect(importRepo.listCdmProjectUserApiKeysForReplace).not.toHaveBeenCalled();
    expect(createApiKeysForCdmImport).toHaveBeenCalledTimes(1);
    expect(result.projectUserApiKeysCreated).toBe(1);
    expect(result.projectUserApiKeysUnchanged).toBe(0);
  });
});

describe('ProjectUserApiKeyCdmEntity: plaintext fingerprint on the import paths', () => {
  const createdKey = { id: '50000000-0000-4000-8000-000000000077', clientId: 'cid-1' };

  it.each([
    ['merge', CdmModeStrategy.Merge],
    ['replace (a key the replace creates)', CdmModeStrategy.Replace],
  ])(
    'create (%s) stores the SHA-256 of the supplied secret and writes no copy',
    async (_label, strategy) => {
      const createApiKeysForCdmImport = vi.fn().mockResolvedValue([createdKey]);
      const { handler } = buildHandler({
        apiKeys: { createApiKeysForCdmImport, deleteApiKeysForCdmImport: vi.fn() },
        projectUserApiKeys: { addProjectUserApiKeysForCdmImport: vi.fn() },
      });

      await handler.apply(applyCtx(baseResult(), strategy), [
        { userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET },
      ]);

      expect(createApiKeysForCdmImport.mock.calls[0][0].keys[0]).toMatchObject({
        clientSecretFingerprint: sha256(BYOK_SECRET),
      });
    }
  );

  it('fingerprints the trimmed secret, the string the stored hash is made from', async () => {
    const createApiKeysForCdmImport = vi.fn().mockResolvedValue([createdKey]);
    const { handler } = buildHandler({
      apiKeys: { createApiKeysForCdmImport, deleteApiKeysForCdmImport: vi.fn() },
      projectUserApiKeys: { addProjectUserApiKeysForCdmImport: vi.fn() },
    });

    await handler.apply(applyCtx(baseResult(), CdmModeStrategy.Merge), [
      { userId, clientSecret: `  ${BYOK_SECRET}\n` },
    ]);

    expect(createApiKeysForCdmImport.mock.calls[0][0].keys[0].clientSecretFingerprint).toBe(
      sha256(BYOK_SECRET)
    );
  });

  it('a key supplied only as a hash gets no fingerprint (the plaintext is unknown)', async () => {
    const createApiKeysForCdmImport = vi.fn().mockResolvedValue([createdKey]);
    const { handler } = buildHandler({
      apiKeys: { createApiKeysForCdmImport, deleteApiKeysForCdmImport: vi.fn() },
      projectUserApiKeys: { addProjectUserApiKeysForCdmImport: vi.fn() },
    });
    const hash = await tokenLib.hashSecretAsync(BYOK_SECRET);

    await handler.apply(applyCtx(baseResult(), CdmModeStrategy.Merge), [
      { userId, clientSecret: '', clientSecretHash: hash },
    ]);

    expect(createApiKeysForCdmImport.mock.calls[0][0].keys[0].clientSecretFingerprint).toBeNull();
  });

  it('rotate stores the fingerprint of the new secret and still writes no copy', async () => {
    const rotateApiKeysForCdmImport = vi.fn().mockResolvedValue(undefined);
    const { handler } = buildHandler({
      importRepo: {
        listCdmProjectUserApiKeysForReplace: vi.fn().mockResolvedValue([
          {
            apiKeyId,
            userId,
            clientId: 'cid-1',
            externalKey: 'ext-1',
            secretFingerprint: fingerprintCdmApiKeySecret('y'.repeat(32), HMAC),
            clientSecretFingerprint: sha256('y'.repeat(32)),
            metadata: {},
          },
        ]),
      },
      apiKeys: {
        createApiKeysForCdmImport: vi.fn(),
        deleteApiKeysForCdmImport: vi.fn(),
        rotateApiKeysForCdmImport,
      },
    });

    await handler.apply(applyCtx(baseResult(), CdmModeStrategy.Replace), [
      { userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET },
    ]);

    expect(rotateApiKeysForCdmImport.mock.calls[0][0].keys).toEqual([
      expect.objectContaining({ id: apiKeyId, clientSecretFingerprint: sha256(BYOK_SECRET) }),
    ]);
  });

  const keptRow = (clientSecretFingerprint: string | null) => ({
    apiKeyId,
    userId,
    clientId: 'cid-1',
    externalKey: 'ext-1',
    secretFingerprint: fingerprintCdmApiKeySecret(BYOK_SECRET, HMAC),
    clientSecretFingerprint,
    metadata: {},
  });

  it('a kept key that has no fingerprint yet gets it, with no rotation and no hashing', async () => {
    const hashSpy = vi.spyOn(tokenLib, 'hashSecretAsync');
    const setMissing = vi.fn().mockResolvedValue(undefined);
    const rotateApiKeysForCdmImport = vi.fn();
    const { handler } = buildHandler({
      importRepo: {
        listCdmProjectUserApiKeysForReplace: vi.fn().mockResolvedValue([keptRow(null)]),
      },
      apiKeys: {
        createApiKeysForCdmImport: vi.fn(),
        deleteApiKeysForCdmImport: vi.fn(),
        rotateApiKeysForCdmImport,
        setMissingClientSecretFingerprintsForCdmImport: setMissing,
      },
    });
    const result = baseResult();
    const ctx = applyCtx(result, CdmModeStrategy.Replace);

    await handler.apply(ctx, [{ userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET }]);

    expect(result.projectUserApiKeysUnchanged).toBe(1);
    expect(rotateApiKeysForCdmImport).not.toHaveBeenCalled();
    expect(hashSpy).not.toHaveBeenCalled();
    expect(setMissing).toHaveBeenCalledWith(
      { keys: [{ id: apiKeyId, clientSecretFingerprint: sha256(BYOK_SECRET) }] },
      ctx.tx
    );
    hashSpy.mockRestore();
  });

  it('a kept key that already has a fingerprint is left alone', async () => {
    const setMissing = vi.fn();
    const { handler } = buildHandler({
      importRepo: {
        listCdmProjectUserApiKeysForReplace: vi
          .fn()
          .mockResolvedValue([keptRow(sha256(BYOK_SECRET))]),
      },
      apiKeys: {
        createApiKeysForCdmImport: vi.fn(),
        deleteApiKeysForCdmImport: vi.fn(),
        setMissingClientSecretFingerprintsForCdmImport: setMissing,
      },
    });

    await handler.apply(applyCtx(baseResult(), CdmModeStrategy.Replace), [
      { userId, externalKey: 'ext-1', clientSecret: BYOK_SECRET },
    ]);

    expect(setMissing).not.toHaveBeenCalled();
  });
});

function applyCtx(result: SyncProjectResult, modeStrategy?: CdmModeStrategy): CdmApplyContext {
  return {
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
    skippedUserKeys: new Set<string>(),
    modeStrategy,
  };
}
