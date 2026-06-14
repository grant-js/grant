import type { CdmApplyContext, CdmExportContext, CdmTeardownContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import {
  CDM_EXPORT_CATALOG_SNAPSHOT_KEY,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
} from '@/constants/cdm-import.constants';
import { ResourceCdmEntity } from '@/lib/cdm/entities/resource.cdm-entity';
import { buildExternalKey } from '@/lib/cdm/identity.lib';
import { ConflictError } from '@/lib/errors';

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

function buildProduced() {
  return {
    roleIdsByKey: new Map<string, string>(),
    tagIds: new Map<string, string>(),
    resourceIds: new Map<string, string>(),
    permissionIds: new Map<string, string>(),
    userIds: new Map<string, string>(),
    groupIdsByKey: new Map<string, string>(),
  };
}

function buildHandler(deps?: {
  importRepo?: {
    listCdmResourceIdsForProject: ReturnType<typeof vi.fn>;
    bulkSoftDeleteCdmResources: ReturnType<typeof vi.fn>;
    reviveCdmResourceAndProjectLinkForProject?: ReturnType<typeof vi.fn>;
  };
  exportRepo?: {
    getProjectLinkedResourcesForExport: ReturnType<typeof vi.fn>;
    getProjectResourceTagsForExport: ReturnType<typeof vi.fn>;
  };
  resources?: {
    createResource: ReturnType<typeof vi.fn>;
    getResourceById?: ReturnType<typeof vi.fn>;
  };
  projectResources?: { addProjectResource: ReturnType<typeof vi.fn> };
}) {
  const importRepo = deps?.importRepo ?? {
    listCdmResourceIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmResources: vi.fn().mockResolvedValue(undefined),
    reviveCdmResourceAndProjectLinkForProject: vi.fn().mockResolvedValue(false),
  };
  const exportRepo = deps?.exportRepo ?? {
    getProjectLinkedResourcesForExport: vi.fn().mockResolvedValue([]),
    getProjectResourceTagsForExport: vi.fn().mockResolvedValue([]),
  };
  const resources = deps?.resources ?? { createResource: vi.fn(), getResourceById: vi.fn() };
  const projectResources = deps?.projectResources ?? {
    addProjectResource: vi.fn().mockResolvedValue(undefined),
  };
  return {
    handler: new ResourceCdmEntity(
      importRepo as never,
      exportRepo as never,
      resources as never,
      projectResources as never
    ),
    importRepo,
    exportRepo,
    resources,
    projectResources,
  };
}

describe('ResourceCdmEntity', () => {
  it('exposes handlerKind / inputKey / order=2', () => {
    const { handler } = buildHandler();
    expect(handler.handlerKind).toBe('resource');
    expect(handler.inputKey).toBe('resources');
    expect(handler.order).toBe(2);
  });

  it('validateInput rejects duplicate key', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([
        { key: 'r1', slug: 'documents', name: 'Documents', actions: ['read'] },
        { key: 'r1', slug: 'invoices', name: 'Invoices', actions: ['read'] },
      ])
    ).toThrow(/Duplicate resources key/);
  });

  it('validateInput rejects missing key / slug / name / empty actions', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([{ key: '', slug: 's', name: 'n', actions: ['read'] }])
    ).toThrow(/key is required/);
    expect(() =>
      handler.validateInput([{ key: 'r1', slug: '   ', name: 'n', actions: ['read'] }])
    ).toThrow(/slug is required/);
    expect(() =>
      handler.validateInput([{ key: 'r1', slug: 's', name: '', actions: ['read'] }])
    ).toThrow(/name is required/);
    expect(() => handler.validateInput([{ key: 'r1', slug: 's', name: 'n', actions: [] }])).toThrow(
      /actions must be a non-empty array/
    );
  });

  it('collectPermissionRefs returns empty (resources have no permission deps)', () => {
    const { handler } = buildHandler();
    expect(
      handler.collectPermissionRefs([
        { key: 'r1', slug: 'documents', name: 'Documents', actions: ['read'] },
      ])
    ).toEqual([]);
  });

  it('teardown is a no-op when no CDM resources exist', async () => {
    const { handler, importRepo } = buildHandler();
    const ctx: CdmTeardownContext = { projectId, scope, tx: { __tx: true } };
    await handler.teardown(ctx);
    expect(importRepo.listCdmResourceIdsForProject).toHaveBeenCalledWith(projectId, ctx.tx);
    expect(importRepo.bulkSoftDeleteCdmResources).not.toHaveBeenCalled();
  });

  it('teardown bulk-soft-deletes CDM resources + pivots when present', async () => {
    const ids = ['40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002'];
    const { handler, importRepo } = buildHandler({
      importRepo: {
        listCdmResourceIdsForProject: vi.fn().mockResolvedValue(ids),
        bulkSoftDeleteCdmResources: vi.fn().mockResolvedValue(undefined),
      },
    });

    const ctx: CdmTeardownContext = { projectId, scope, tx: { __tx: true } };
    await handler.teardown(ctx);
    expect(importRepo.bulkSoftDeleteCdmResources).toHaveBeenCalledWith(ids, projectId, ctx.tx);
  });

  it('apply creates resource + project_resource, embeds CDM metadata, publishes produced.resourceIds, and increments counters', async () => {
    const created1 = { id: '50000000-0000-4000-8000-000000000077', slug: 'documents' };
    const created2 = { id: '50000000-0000-4000-8000-000000000088', slug: 'invoices' };
    const createResource = vi.fn().mockResolvedValueOnce(created1).mockResolvedValueOnce(created2);
    const addProjectResource = vi.fn().mockResolvedValue(undefined);
    const { handler, projectResources } = buildHandler({
      resources: { createResource },
      projectResources: { addProjectResource },
    });

    const result = baseResult();
    const produced = buildProduced();
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
        key: 'rk1',
        slug: 'documents',
        name: 'Documents',
        description: 'Custom docs',
        actions: ['read', 'write'],
        metadata: { legacy: 'L1' },
      },
      {
        key: 'rk2',
        slug: 'invoices',
        name: 'Invoices',
        actions: ['read'],
      },
    ]);

    expect(createResource).toHaveBeenCalledTimes(2);
    expect(createResource).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        slug: 'documents',
        name: 'Documents',
        description: 'Custom docs',
        actions: ['read', 'write'],
        metadata: expect.objectContaining({
          [CDM_IMPORT_METADATA_KEY]: expect.objectContaining({
            projectId,
            kind: 'resource',
            externalKey: 'rk1',
          }),
          [CDM_SOURCE_METADATA_KEY]: { legacy: 'L1' },
        }),
      }),
      ctx.tx
    );

    expect(projectResources.addProjectResource).toHaveBeenNthCalledWith(
      1,
      { projectId, resourceId: created1.id },
      ctx.tx
    );
    expect(projectResources.addProjectResource).toHaveBeenNthCalledWith(
      2,
      { projectId, resourceId: created2.id },
      ctx.tx
    );

    expect(produced.resourceIds.get('rk1')).toBe(created1.id);
    expect(produced.resourceIds.get('rk2')).toBe(created2.id);
    expect(result.resourcesCreated).toBe(2);
    expect(result.projectResourcesLinked).toBe(2);
  });

  it('export emits opaque keys, grantResourceId, and catalog snapshot flag for non-CDM rows', async () => {
    const resourceId = '60000000-0000-4000-8000-0000000000aa';
    const catalogResourceId = '60000000-0000-4000-8000-0000000000bb';
    const tagId = '70000000-0000-4000-8000-000000000001';
    const expectedTagKey = buildExternalKey('tag', tagId, 'Document', 'blue');
    const getProjectLinkedResourcesForExport = vi.fn().mockResolvedValue([
      {
        resourceId,
        slug: 'documents',
        name: 'Documents',
        description: 'desc',
        actions: ['read'],
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: { projectId, kind: 'resource', externalKey: 'rk1' },
          [CDM_SOURCE_METADATA_KEY]: { legacy: 'L1' },
        },
      },
      {
        resourceId: catalogResourceId,
        slug: 'invoices',
        name: 'Invoices',
        description: null,
        actions: ['read', 'write'],
        metadata: {},
      },
    ]);
    const getProjectResourceTagsForExport = vi.fn().mockResolvedValue([
      {
        resourceId,
        tagId,
        tagName: 'Document',
        tagColor: 'blue',
        isPrimary: true,
      },
    ]);
    const { handler } = buildHandler({
      exportRepo: { getProjectLinkedResourcesForExport, getProjectResourceTagsForExport },
    });

    const ctx: CdmExportContext = { projectId, scope };
    const out = await handler.export(ctx);

    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      key: expect.stringMatching(/^cdm-resource-[a-f0-9]{16}$/),
      slug: 'documents',
      name: 'Documents',
      description: 'desc',
      actions: ['read'],
      metadata: { legacy: 'L1', grantResourceId: resourceId },
      tags: [expectedTagKey],
      primaryTag: expectedTagKey,
    });
    expect(out[1].metadata).toEqual({
      grantResourceId: catalogResourceId,
      [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
    });
  });

  it('apply catalog snapshot links existing resource and skips createResource', async () => {
    const existingId = '60000000-0000-4000-8000-0000000000aa';
    const getResourceById = vi.fn().mockResolvedValue({ id: existingId, slug: 'documents' });
    const addProjectResource = vi.fn().mockResolvedValue(undefined);
    const createResource = vi.fn();
    const { handler } = buildHandler({
      resources: { createResource, getResourceById },
      projectResources: { addProjectResource },
    });

    const result = baseResult();
    const produced = buildProduced();
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
        key: 'rk1',
        slug: 'documents',
        name: 'Documents',
        actions: ['read'],
        metadata: {
          grantResourceId: existingId,
          [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
        },
      },
    ]);

    expect(createResource).not.toHaveBeenCalled();
    expect(getResourceById).toHaveBeenCalledWith(existingId, ctx.tx);
    expect(addProjectResource).toHaveBeenCalledWith({ projectId, resourceId: existingId }, ctx.tx);
    expect(produced.resourceIds.get('rk1')).toBe(existingId);
    expect(result.resourcesCreated).toBe(0);
    expect(result.projectResourcesLinked).toBe(1);
  });

  it('apply catalog snapshot revives soft-deleted resource then links', async () => {
    const existingId = '60000000-0000-4000-8000-0000000000aa';
    const getResourceById = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: existingId, slug: 'documents' });
    const reviveCdmResourceAndProjectLinkForProject = vi.fn().mockResolvedValue(true);
    const addProjectResource = vi.fn().mockResolvedValue(undefined);
    const createResource = vi.fn();
    const { handler } = buildHandler({
      importRepo: {
        listCdmResourceIdsForProject: vi.fn().mockResolvedValue([]),
        bulkSoftDeleteCdmResources: vi.fn().mockResolvedValue(undefined),
        reviveCdmResourceAndProjectLinkForProject,
      },
      resources: { createResource, getResourceById },
      projectResources: { addProjectResource },
    });

    const result = baseResult();
    const produced = buildProduced();
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
        key: 'rk1',
        slug: 'documents',
        name: 'Documents',
        actions: ['read'],
        metadata: {
          grantResourceId: existingId,
          [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
        },
      },
    ]);

    expect(reviveCdmResourceAndProjectLinkForProject).toHaveBeenCalledWith(
      existingId,
      projectId,
      ctx.tx
    );
    expect(getResourceById).toHaveBeenCalledTimes(2);
    expect(createResource).not.toHaveBeenCalled();
    expect(addProjectResource).toHaveBeenCalledWith({ projectId, resourceId: existingId }, ctx.tx);
    expect(produced.resourceIds.get('rk1')).toBe(existingId);
    expect(result.projectResourcesLinked).toBe(1);
  });

  it('apply catalog snapshot treats duplicate project_resource as idempotent', async () => {
    const existingId = '60000000-0000-4000-8000-0000000000aa';
    const getResourceById = vi.fn().mockResolvedValue({ id: existingId, slug: 'documents' });
    const addProjectResource = vi
      .fn()
      .mockRejectedValue(
        new ConflictError('Project already has this resource', 'ProjectResource', 'resourceId')
      );
    const { handler } = buildHandler({
      resources: { createResource: vi.fn(), getResourceById },
      projectResources: { addProjectResource },
    });

    const result = baseResult();
    const produced = buildProduced();
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
        key: 'rk1',
        slug: 'documents',
        name: 'Documents',
        actions: ['read'],
        metadata: {
          grantResourceId: existingId,
          [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
        },
      },
    ]);

    expect(produced.resourceIds.get('rk1')).toBe(existingId);
    expect(result.projectResourcesLinked).toBe(0);
  });
});
