import type { CdmApplyContext, CdmExportContext, CdmTeardownContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY, CDM_SOURCE_METADATA_KEY } from '@/constants/cdm-import.constants';
import { TagCdmEntity } from '@/lib/cdm/entities/tag.cdm-entity';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

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
    listCdmTagIdsForProject: ReturnType<typeof vi.fn>;
    bulkSoftDeleteCdmTags: ReturnType<typeof vi.fn>;
  };
  exportRepo?: { getProjectTagDefinitions: ReturnType<typeof vi.fn> };
  tags?: { createTag: ReturnType<typeof vi.fn> };
  projectTags?: { addProjectTag: ReturnType<typeof vi.fn> };
}) {
  const importRepo = deps?.importRepo ?? {
    listCdmTagIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmTags: vi.fn().mockResolvedValue(undefined),
  };
  const exportRepo = deps?.exportRepo ?? {
    getProjectTagDefinitions: vi.fn().mockResolvedValue([]),
  };
  const tags = deps?.tags ?? {
    createTag: vi.fn(),
  };
  const projectTags = deps?.projectTags ?? {
    addProjectTag: vi.fn(),
  };
  return {
    handler: new TagCdmEntity(
      importRepo as never,
      exportRepo as never,
      tags as never,
      projectTags as never
    ),
    importRepo,
    exportRepo,
    tags,
    projectTags,
  };
}

describe('TagCdmEntity', () => {
  it('exposes handlerKind / inputKey / order=5', () => {
    const { handler } = buildHandler();
    expect(handler.handlerKind).toBe('tag');
    expect(handler.inputKey).toBe('tags');
    expect(handler.order).toBe(5);
  });

  it('validateInput rejects duplicate key', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([
        { key: 't1', name: 'Alpha', color: '#fff' },
        { key: 't1', name: 'Beta', color: '#000' },
      ])
    ).toThrow(/Duplicate tags key/);
  });

  it('validateInput rejects missing key', () => {
    const { handler } = buildHandler();
    expect(() => handler.validateInput([{ key: '', name: 'Alpha', color: '#fff' }])).toThrow(
      /key is required/
    );
  });

  it('validateInput rejects empty name and color', () => {
    const { handler } = buildHandler();
    expect(() => handler.validateInput([{ key: 't1', name: '   ', color: '#fff' }])).toThrow(
      /name is required/
    );
    expect(() => handler.validateInput([{ key: 't1', name: 'Alpha', color: '' }])).toThrow(
      /color is required/
    );
  });

  it('collectPermissionRefs returns empty (tags have no permission deps)', () => {
    const { handler } = buildHandler();
    expect(handler.collectPermissionRefs([{ key: 't1', name: 'Alpha', color: '#fff' }])).toEqual(
      []
    );
  });

  it('teardown is a no-op when no CDM tags exist', async () => {
    const { handler, importRepo } = buildHandler();
    const ctx: CdmTeardownContext = { projectId, scope, tx: { __tx: true } };
    await handler.teardown(ctx);
    expect(importRepo.listCdmTagIdsForProject).toHaveBeenCalledWith(projectId, ctx.tx);
    expect(importRepo.bulkSoftDeleteCdmTags).not.toHaveBeenCalled();
  });

  it('teardown bulk-soft-deletes CDM tags + pivots when present', async () => {
    const tagIds = ['40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002'];
    const listCdmTagIdsForProject = vi.fn().mockResolvedValue(tagIds);
    const bulkSoftDeleteCdmTags = vi.fn().mockResolvedValue(undefined);
    const { handler } = buildHandler({
      importRepo: { listCdmTagIdsForProject, bulkSoftDeleteCdmTags },
    });

    const ctx: CdmTeardownContext = { projectId, scope, tx: { __tx: true } };
    await handler.teardown(ctx);

    expect(bulkSoftDeleteCdmTags).toHaveBeenCalledWith(tagIds, projectId, ctx.tx);
  });

  it('apply creates tag + project_tag, embeds CDM metadata, publishes produced.tagIds, and increments counters', async () => {
    const created1 = { id: '50000000-0000-4000-8000-000000000077', name: 'Alpha', color: '#fff' };
    const created2 = { id: '50000000-0000-4000-8000-000000000088', name: 'Beta', color: '#000' };
    const createTag = vi.fn().mockResolvedValueOnce(created1).mockResolvedValueOnce(created2);
    const addProjectTag = vi.fn().mockResolvedValue(undefined);
    const { handler, projectTags } = buildHandler({
      tags: { createTag },
      projectTags: { addProjectTag },
    });

    const result = baseResult();
    const produced = {
      roleIdsByKey: new Map<string, string>(),
      tagIds: new Map<string, string>(),
      resourceIds: new Map<string, string>(),
      permissionIds: new Map<string, string>(),
      userIds: new Map<string, string>(),
      groupIdsByKey: new Map<string, string>(),
    };
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: { __tx: true },
      lookupResolvedRef: () => ({}),
      result,
      produced,
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set<string>(),
    };

    await handler.apply(ctx, [
      {
        key: 'k1',
        name: 'Alpha',
        color: '#fff',
        metadata: { legacy: 'L1' },
      },
      {
        key: 'k2',
        name: 'Beta',
        color: '#000',
      },
    ]);

    expect(createTag).toHaveBeenCalledTimes(2);
    expect(createTag).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'Alpha',
        color: '#fff',
        metadata: expect.objectContaining({
          [CDM_IMPORT_METADATA_KEY]: expect.objectContaining({
            projectId,
            kind: 'tag',
            externalKey: 'k1',
          }),
          [CDM_SOURCE_METADATA_KEY]: { legacy: 'L1' },
        }),
      }),
      ctx.tx
    );

    expect(projectTags.addProjectTag).toHaveBeenNthCalledWith(
      1,
      { projectId, tagId: created1.id, isPrimary: false },
      ctx.tx
    );
    expect(projectTags.addProjectTag).toHaveBeenNthCalledWith(
      2,
      { projectId, tagId: created2.id, isPrimary: false },
      ctx.tx
    );

    expect(produced.tagIds.get('k1')).toBe(created1.id);
    expect(produced.tagIds.get('k2')).toBe(created2.id);
    expect(result.tagsCreated).toBe(2);
    expect(result.projectTagsLinked).toBe(2);
  });

  it('export maps project tag rows to TagCdmInput[] with opaque key and grantTagId in cdmSource', async () => {
    const tagId = '60000000-0000-4000-8000-0000000000aa';
    const getProjectTagDefinitions = vi.fn().mockResolvedValue([
      {
        tagId,
        name: 'Alpha',
        color: '#fff',
        isPrimary: true,
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: { projectId, kind: 'tag', externalKey: 'k1' },
          [CDM_SOURCE_METADATA_KEY]: { legacy: 'L1' },
        },
      },
      {
        tagId: '60000000-0000-4000-8000-0000000000bb',
        name: 'Beta',
        color: '#000',
        isPrimary: false,
        metadata: {},
      },
    ]);
    const { handler } = buildHandler({
      exportRepo: { getProjectTagDefinitions },
    });

    const ctx: CdmExportContext = { projectId, scope };
    const out = await handler.export(ctx);

    expect(getProjectTagDefinitions).toHaveBeenCalledWith(projectId, undefined);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      key: expect.stringMatching(/^cdm-tag-[a-f0-9]{16}$/),
      name: 'Alpha',
      color: '#fff',
      metadata: { legacy: 'L1', grantTagId: tagId },
    });
    expect(out[1]).toEqual({
      key: expect.stringMatching(/^cdm-tag-[a-f0-9]{16}$/),
      name: 'Beta',
      color: '#000',
      metadata: { grantTagId: '60000000-0000-4000-8000-0000000000bb' },
    });
    expect(out[0].key).not.toBe(out[1].key);
  });

  it('export key is stable for a given (tagId, name, color)', async () => {
    const tagId = '60000000-0000-4000-8000-0000000000cc';
    const getProjectTagDefinitions = vi
      .fn()
      .mockResolvedValue([{ tagId, name: 'Gamma', color: '#abc', isPrimary: false, metadata: {} }]);
    const { handler } = buildHandler({ exportRepo: { getProjectTagDefinitions } });

    const out1 = await handler.export({ projectId, scope } as CdmExportContext);
    const out2 = await handler.export({ projectId, scope } as CdmExportContext);
    expect(out1[0].key).toBe(out2[0].key);
    expect(out1[0].key).not.toBe(tagId);
  });
});
