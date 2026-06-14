import type { CdmApplyContext, CdmExportContext, CdmTeardownContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import {
  CDM_EXPORT_CATALOG_SNAPSHOT_KEY,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
} from '@/constants/cdm-import.constants';
import { PermissionCdmEntity } from '@/lib/cdm/entities/permission.cdm-entity';
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

function buildProduced(seed?: { resourceIds?: Map<string, string> }) {
  return {
    roleIdsByKey: new Map<string, string>(),
    tagIds: new Map<string, string>(),
    resourceIds: seed?.resourceIds ?? new Map<string, string>(),
    permissionIds: new Map<string, string>(),
    userIds: new Map<string, string>(),
    groupIdsByKey: new Map<string, string>(),
  };
}

function buildHandler(deps?: {
  importRepo?: {
    listCdmPermissionIdsForProject: ReturnType<typeof vi.fn>;
    bulkSoftDeleteCdmPermissions: ReturnType<typeof vi.fn>;
    resolvePermission?: ReturnType<typeof vi.fn>;
  };
  exportRepo?: {
    getProjectLinkedPermissionsForExport: ReturnType<typeof vi.fn>;
    getProjectLinkedResourcesForExport: ReturnType<typeof vi.fn>;
    getProjectPermissionTagsForExport: ReturnType<typeof vi.fn>;
  };
  permissions?: { createPermission: ReturnType<typeof vi.fn> };
  projectPermissions?: { addProjectPermission: ReturnType<typeof vi.fn> };
  resources?: { getResourceById: ReturnType<typeof vi.fn> };
}) {
  const importRepo = deps?.importRepo ?? {
    listCdmPermissionIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmPermissions: vi.fn().mockResolvedValue(undefined),
    resolvePermission: vi.fn(),
  };
  const exportRepo = deps?.exportRepo ?? {
    getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([]),
    getProjectLinkedResourcesForExport: vi.fn().mockResolvedValue([]),
    getProjectPermissionTagsForExport: vi.fn().mockResolvedValue([]),
  };
  const permissions = deps?.permissions ?? { createPermission: vi.fn() };
  const projectPermissions = deps?.projectPermissions ?? {
    addProjectPermission: vi.fn().mockResolvedValue(undefined),
  };
  const resources = deps?.resources ?? { getResourceById: vi.fn() };
  return {
    handler: new PermissionCdmEntity(
      importRepo as never,
      exportRepo as never,
      permissions as never,
      projectPermissions as never,
      resources as never
    ),
    importRepo,
    exportRepo,
    permissions,
    projectPermissions,
    resources,
  };
}

describe('PermissionCdmEntity', () => {
  it('exposes handlerKind / inputKey / order=4', () => {
    const { handler } = buildHandler();
    expect(handler.handlerKind).toBe('permission');
    expect(handler.inputKey).toBe('permissions');
    expect(handler.order).toBe(4);
  });

  it('validateInput rejects duplicate key and missing required fields', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([
        { key: 'p1', resource: 'r1', action: 'read', name: 'P1' },
        { key: 'p1', resource: 'r1', action: 'write', name: 'P2' },
      ])
    ).toThrow(/Duplicate permissions key/);
    expect(() =>
      handler.validateInput([{ key: '', resource: 'r1', action: 'read', name: 'n' }])
    ).toThrow(/key is required/);
    expect(() =>
      handler.validateInput([{ key: 'p1', resource: '', action: 'read', name: 'n' }])
    ).toThrow(/resource is required/);
    expect(() =>
      handler.validateInput([{ key: 'p1', resource: 'r1', action: '', name: 'n' }])
    ).toThrow(/action is required/);
    expect(() =>
      handler.validateInput([{ key: 'p1', resource: 'r1', action: 'read', name: '' }])
    ).toThrow(/name is required/);
  });

  it('teardown bulk-soft-deletes CDM permissions when present', async () => {
    const ids = ['40000000-0000-4000-8000-000000000001'];
    const { handler, importRepo } = buildHandler({
      importRepo: {
        listCdmPermissionIdsForProject: vi.fn().mockResolvedValue(ids),
        bulkSoftDeleteCdmPermissions: vi.fn().mockResolvedValue(undefined),
      },
    });
    const ctx: CdmTeardownContext = { projectId, scope, tx: { __tx: true } };
    await handler.teardown(ctx);
    expect(importRepo.bulkSoftDeleteCdmPermissions).toHaveBeenCalledWith(ids, projectId, ctx.tx);
  });

  it('apply resolves resource from produced.resourceIds and creates permission + project_permission', async () => {
    const resourceId = '50000000-0000-4000-8000-000000000099';
    const created = { id: '50000000-0000-4000-8000-0000000000aa' };
    const createPermission = vi.fn().mockResolvedValue(created);
    const addProjectPermission = vi.fn().mockResolvedValue(undefined);
    const { handler, projectPermissions } = buildHandler({
      permissions: { createPermission },
      projectPermissions: { addProjectPermission },
    });

    const result = baseResult();
    const produced = buildProduced({ resourceIds: new Map([['rk1', resourceId]]) });
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
        key: 'pk1',
        resource: 'rk1',
        action: 'read',
        name: 'Documents:read',
        description: 'desc',
        condition: { tenant: 'A' },
        metadata: { legacy: 'L1' },
      },
    ]);

    expect(createPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Documents:read',
        action: 'read',
        resourceId,
        condition: { tenant: 'A' },
        description: 'desc',
        metadata: expect.objectContaining({
          [CDM_IMPORT_METADATA_KEY]: expect.objectContaining({
            projectId,
            kind: 'permission',
            externalKey: 'pk1',
          }),
          [CDM_SOURCE_METADATA_KEY]: { legacy: 'L1' },
        }),
      }),
      ctx.tx
    );

    expect(projectPermissions.addProjectPermission).toHaveBeenCalledWith(
      { projectId, permissionId: created.id },
      ctx.tx
    );
    expect(produced.permissionIds.get('pk1')).toBe(created.id);
    expect(result.permissionsCreated).toBe(1);
    expect(result.projectPermissionsLinked).toBe(1);
  });

  it('apply catalog snapshot resolves catalog permission and skips createPermission', async () => {
    const resourceId = '50000000-0000-4000-8000-000000000099';
    const catalogPermissionId = '50000000-0000-4000-8000-0000000000aa';
    const resolvePermission = vi.fn().mockResolvedValue({
      id: catalogPermissionId,
      resourceId,
    });
    const getResourceById = vi.fn().mockResolvedValue({ id: resourceId, slug: 'documents' });
    const createPermission = vi.fn();
    const addProjectPermission = vi.fn().mockResolvedValue(undefined);
    const { handler, importRepo, projectPermissions } = buildHandler({
      importRepo: {
        listCdmPermissionIdsForProject: vi.fn().mockResolvedValue([]),
        bulkSoftDeleteCdmPermissions: vi.fn().mockResolvedValue(undefined),
        resolvePermission,
      },
      permissions: { createPermission },
      projectPermissions: { addProjectPermission },
      resources: { getResourceById },
    });

    const result = baseResult();
    const produced = buildProduced({ resourceIds: new Map([['rk1', resourceId]]) });
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
        key: 'pk1',
        resource: 'rk1',
        action: 'read',
        name: 'Documents:read',
        metadata: {
          grantPermissionId: catalogPermissionId,
          [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
        },
      },
    ]);

    expect(createPermission).not.toHaveBeenCalled();
    expect(importRepo.resolvePermission).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceSlug: 'documents',
        action: 'read',
        permissionId: catalogPermissionId,
      }),
      ctx.tx
    );
    expect(projectPermissions.addProjectPermission).toHaveBeenCalledWith(
      { projectId, permissionId: catalogPermissionId },
      ctx.tx
    );
    expect(produced.permissionIds.get('pk1')).toBe(catalogPermissionId);
    expect(result.permissionsCreated).toBe(0);
    expect(result.projectPermissionsLinked).toBe(1);
  });

  it('apply catalog snapshot treats duplicate project_permission as idempotent', async () => {
    const resourceId = '50000000-0000-4000-8000-000000000099';
    const catalogPermissionId = '50000000-0000-4000-8000-0000000000aa';
    const resolvePermission = vi.fn().mockResolvedValue({
      id: catalogPermissionId,
      resourceId,
    });
    const addProjectPermission = vi
      .fn()
      .mockRejectedValue(
        new ConflictError(
          'Project already has this permission',
          'ProjectPermission',
          'permissionId'
        )
      );
    const { handler } = buildHandler({
      importRepo: {
        listCdmPermissionIdsForProject: vi.fn().mockResolvedValue([]),
        bulkSoftDeleteCdmPermissions: vi.fn().mockResolvedValue(undefined),
        resolvePermission,
      },
      permissions: { createPermission: vi.fn() },
      projectPermissions: { addProjectPermission },
      resources: {
        getResourceById: vi.fn().mockResolvedValue({ id: resourceId, slug: 'documents' }),
      },
    });

    const result = baseResult();
    const produced = buildProduced({ resourceIds: new Map([['rk1', resourceId]]) });
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
        key: 'pk1',
        resource: 'rk1',
        action: 'read',
        name: 'Documents:read',
        metadata: {
          grantPermissionId: catalogPermissionId,
          [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
        },
      },
    ]);

    expect(produced.permissionIds.get('pk1')).toBe(catalogPermissionId);
    expect(result.projectPermissionsLinked).toBe(0);
  });

  it('apply throws ValidationError when resource is not declared in the same document', async () => {
    const { handler } = buildHandler({
      permissions: { createPermission: vi.fn() },
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

    await expect(
      handler.apply(ctx, [{ key: 'pk1', resource: 'missing', action: 'read', name: 'N' }])
    ).rejects.toThrow(/resourceKey "missing" must reference a resource declared/);
  });

  it('export emits opaque key, references resource key, and embeds grantPermissionId', async () => {
    const resourceId = '60000000-0000-4000-8000-0000000000aa';
    const permissionId = '60000000-0000-4000-8000-0000000000bb';
    const expectedResourceKey = buildExternalKey('resource', resourceId, 'documents');
    const tagId = '70000000-0000-4000-8000-000000000001';
    const expectedTagKey = buildExternalKey('tag', tagId, 'Document', 'blue');
    const getProjectLinkedResourcesForExport = vi.fn().mockResolvedValue([
      {
        resourceId,
        slug: 'documents',
        name: 'Documents',
        description: null,
        actions: ['read'],
        metadata: {},
      },
    ]);
    const getProjectLinkedPermissionsForExport = vi.fn().mockResolvedValue([
      {
        permissionId,
        resourceId,
        resourceSlug: 'documents',
        action: 'read',
        name: 'Documents:read',
        description: null,
        condition: null,
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: { projectId, kind: 'permission', externalKey: 'orig' },
          [CDM_SOURCE_METADATA_KEY]: { legacy: 'L1' },
        },
      },
    ]);
    const getProjectPermissionTagsForExport = vi.fn().mockResolvedValue([
      {
        permissionId,
        tagId,
        tagName: 'Document',
        tagColor: 'blue',
        isPrimary: true,
      },
    ]);
    const { handler } = buildHandler({
      exportRepo: {
        getProjectLinkedPermissionsForExport,
        getProjectLinkedResourcesForExport,
        getProjectPermissionTagsForExport,
      },
    });

    const ctx: CdmExportContext = { projectId, scope };
    const out = await handler.export(ctx);

    expect(out).toEqual([
      {
        key: expect.stringMatching(/^cdm-permission-[a-f0-9]{16}$/),
        resource: expectedResourceKey,
        action: 'read',
        name: 'Documents:read',
        description: null,
        condition: null,
        metadata: { legacy: 'L1', grantPermissionId: permissionId },
        tags: [expectedTagKey],
        primaryTag: expectedTagKey,
      },
    ]);
    expect(out[0].key).not.toBe(permissionId);
  });

  it('export adds catalog snapshot flag for non-CDM permission rows', async () => {
    const resourceId = '60000000-0000-4000-8000-0000000000aa';
    const permissionId = '60000000-0000-4000-8000-0000000000bb';
    const getProjectLinkedResourcesForExport = vi.fn().mockResolvedValue([
      {
        resourceId,
        slug: 'documents',
        name: 'Documents',
        description: null,
        actions: ['read'],
        metadata: {},
      },
    ]);
    const getProjectLinkedPermissionsForExport = vi.fn().mockResolvedValue([
      {
        permissionId,
        resourceId,
        resourceSlug: 'documents',
        action: 'read',
        name: 'Documents:read',
        description: null,
        condition: null,
        metadata: {},
      },
    ]);
    const { handler } = buildHandler({
      exportRepo: {
        getProjectLinkedPermissionsForExport,
        getProjectLinkedResourcesForExport,
        getProjectPermissionTagsForExport: vi.fn().mockResolvedValue([]),
      },
    });

    const out = await handler.export({ projectId, scope } as CdmExportContext);
    expect(out).toHaveLength(1);
    expect(out[0].metadata).toEqual({
      grantPermissionId: permissionId,
      [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true,
    });
  });

  it('export skips orphan permissions whose resource is not exported', async () => {
    const getProjectLinkedResourcesForExport = vi.fn().mockResolvedValue([]);
    const getProjectLinkedPermissionsForExport = vi.fn().mockResolvedValue([
      {
        permissionId: '60000000-0000-4000-8000-0000000000bb',
        resourceId: '60000000-0000-4000-8000-0000000000aa',
        resourceSlug: 'documents',
        action: 'read',
        name: 'Documents:read',
        description: null,
        condition: null,
        metadata: {},
      },
    ]);
    const { handler } = buildHandler({
      exportRepo: {
        getProjectLinkedPermissionsForExport,
        getProjectLinkedResourcesForExport,
        getProjectPermissionTagsForExport: vi.fn().mockResolvedValue([]),
      },
    });

    const out = await handler.export({ projectId, scope } as CdmExportContext);
    expect(out).toEqual([]);
  });
});
