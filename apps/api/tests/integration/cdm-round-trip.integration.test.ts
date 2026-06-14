/**
 * Round-trip integration test for CDM full-project export/import.
 *
 * Stages a synthetic "project A" with custom resources, custom permissions,
 * tags, role-templates (cross-referencing both via `permissionKey` and
 * `tagKeys` / `groupTagKeys`), and a user-assignment carrying a `tagKey`.
 *
 * Asserts:
 *   1. Exporter emits opaque external keys for every CDM-portable entity.
 *      No Grant UUID leaks as identity. Original Grant ids show up only
 *      inside `metadata.cdmSource.grant*Id`.
 *   2. Cross-references in the exported document are internally consistent:
 *      every `tagKey`, `groupTagKey`, `roleTemplateKey`, and `permissionKey`
 *      points at an entity that was emitted in the same document.
 *   3. The exported document re-imports cleanly into a fresh project B:
 *      every cross-reference resolves via `produced.*` maps, no permission-
 *      ref errors, and the resulting fresh ids are different from project A's.
 */
import type { CdmExportContext, ICdmEntityHandler } from '@grantjs/core';
import { CdmModeStrategy, type Scope, type SyncProjectInput, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import {
  assembleExportedSyncProjectInput,
  expandCdmSyncInput,
  PermissionCdmEntity,
  ResourceCdmEntity,
  RoleTemplateCdmEntity,
  TagCdmEntity,
  UserAssignmentCdmEntity,
} from '@/lib/cdm';

const projectAId = 'aaaa0000-0000-4000-8000-000000000001';
const projectBId = 'bbbb0000-0000-4000-8000-000000000002';
const accountId = 'cccc0000-0000-4000-8000-000000000003';
const userId = 'dddd0000-0000-4000-8000-000000000004';

const scopeA: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectAId}` };
const scopeB: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectBId}` };

/**
 * Project A row ids, all UUIDs. The round-trip test asserts NONE of these
 * appear as identity in the exported document — they must only show up under
 * `metadata.cdmSource.grant*Id`.
 */
const A = {
  resourceId: 'a0000000-0000-4000-8000-0000000000aa',
  permissionId: 'a0000000-0000-4000-8000-0000000000bb',
  tagId: 'a0000000-0000-4000-8000-0000000000cc',
  roleId: 'a0000000-0000-4000-8000-0000000000dd',
  groupId: 'a0000000-0000-4000-8000-0000000000ee',
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function buildExportRepoForProjectA() {
  return {
    getProjectLinkedResourcesForExport: vi.fn().mockResolvedValue([
      {
        resourceId: A.resourceId,
        slug: 'documents',
        name: 'Documents',
        description: 'Custom docs',
        actions: ['read', 'write'],
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId: projectAId,
            kind: 'resource',
            externalKey: 'orig-resource',
          },
        },
      },
    ]),
    getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([
      {
        permissionId: A.permissionId,
        resourceId: A.resourceId,
        resourceSlug: 'documents',
        action: 'read',
        name: 'Documents:read',
        description: null,
        condition: null,
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId: projectAId,
            kind: 'permission',
            externalKey: 'orig-permission',
          },
        },
      },
    ]),
    getProjectResourceTagsForExport: vi.fn().mockResolvedValue([
      {
        resourceId: A.resourceId,
        tagId: A.tagId,
        tagName: 'Alpha',
        tagColor: '#fff',
        isPrimary: true,
      },
    ]),
    getProjectPermissionTagsForExport: vi.fn().mockResolvedValue([
      {
        permissionId: A.permissionId,
        tagId: A.tagId,
        tagName: 'Alpha',
        tagColor: '#fff',
        isPrimary: true,
      },
    ]),
    getProjectTagDefinitions: vi.fn().mockResolvedValue([
      {
        tagId: A.tagId,
        name: 'Alpha',
        color: '#fff',
        isPrimary: true,
        metadata: {},
      },
    ]),
    getProjectRolesWithPermissions: vi.fn().mockResolvedValue([
      {
        roleId: A.roleId,
        name: 'CDM: Viewer',
        description: 'Read-only role',
        permissions: [
          {
            permissionId: A.permissionId,
            resourceSlug: 'documents',
            action: 'read',
            condition: null,
          },
        ],
        metadata: {},
      },
    ]),
    getRoleTagsByRoleIds: vi.fn().mockResolvedValue([{ ownerId: A.roleId, tagId: A.tagId }]),
    getGroupTagsByGroupIds: vi.fn().mockResolvedValue([{ ownerId: A.groupId, tagId: A.tagId }]),
    getCdmGroupIdsForRoleIds: vi.fn().mockResolvedValue(new Map([[A.roleId, A.groupId]])),
    getGroupsByIds: vi
      .fn()
      .mockResolvedValue([{ groupId: A.groupId, name: 'DocumentFullAccess', description: null }]),
    getGroupPermissionIdsByGroupIds: vi
      .fn()
      .mockResolvedValue([{ groupId: A.groupId, permissionId: A.permissionId }]),
    getProjectUsersWithRoleIds: vi
      .fn()
      .mockResolvedValue([{ userId, roleIds: [A.roleId], metadata: {} }]),
    getProjectUserDirectPermissions: vi.fn().mockResolvedValue([]),
    getProjectUserDirectGroups: vi.fn().mockResolvedValue([]),
    getUserTagsByUserIds: vi.fn().mockResolvedValue([{ ownerId: userId, tagId: A.tagId }]),
    getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
  };
}

function buildHandlers(exportRepo: ReturnType<typeof buildExportRepoForProjectA>) {
  const resource = new ResourceCdmEntity(
    {} as never,
    exportRepo as never,
    {} as never,
    {} as never
  );
  const permission = new PermissionCdmEntity(
    {} as never,
    exportRepo as never,
    {} as never,
    {} as never,
    {} as never
  );
  const tag = new TagCdmEntity({} as never, exportRepo as never, {} as never, {} as never);
  const roleTemplate = new RoleTemplateCdmEntity(
    {} as never,
    exportRepo as never,
    {} as never,
    {} as never,
    {} as never
  );
  const userAssignment = new UserAssignmentCdmEntity(
    exportRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
  return { resource, permission, tag, roleTemplate, userAssignment };
}

async function exportProjectA(
  handlers: ReturnType<typeof buildHandlers>
): Promise<SyncProjectInput> {
  const ctx: CdmExportContext = { projectId: projectAId, scope: scopeA };
  const [resources, permissions, tags, roleTemplates, userAssignments] = await Promise.all([
    handlers.resource.export(ctx),
    handlers.permission.export(ctx),
    handlers.tag.export(ctx),
    handlers.roleTemplate.export(ctx),
    handlers.userAssignment.export(ctx),
  ]);

  const assembled = assembleExportedSyncProjectInput({
    roleTemplates,
    userAssignments,
    projectUserApiKeys: [],
    provisionedUsers: [],
    resourcesSlice: resources ?? [],
    permissionsSlice: permissions ?? [],
    tagsSlice: tags ?? [],
  });

  return {
    version: 1,
    id: 'round-trip-1',
    mode: {
      strategy: CdmModeStrategy.Merge,
      onConflict: null,
      confirmDestructive: false,
    },
    ...assembled,
  };
}

function collectAllStringValues(value: unknown, into: string[]): void {
  if (typeof value === 'string') {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectAllStringValues(v, into);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectAllStringValues(v, into);
  }
}

describe('CDM round-trip integration', () => {
  it('export project A: every CDM key is opaque (cdm-* prefix), no Grant UUIDs leak as identity', async () => {
    const exportRepo = buildExportRepoForProjectA();
    const handlers = buildHandlers(exportRepo);
    const doc = await exportProjectA(handlers);

    expect(doc.resources).toHaveLength(1);
    expect(doc.resources?.[0].key).toMatch(/^cdm-resource-[a-f0-9]{16}$/);
    expect(doc.permissions).toHaveLength(1);
    expect(doc.permissions?.[0].key).toMatch(/^cdm-permission-[a-f0-9]{16}$/);
    expect(doc.tags).toHaveLength(1);
    expect(doc.tags?.[0].key).toMatch(/^cdm-tag-[a-f0-9]{16}$/);
    expect(doc.roles).toHaveLength(1);
    expect(doc.roles[0].key).toMatch(/^cdm-role-[a-f0-9]{16}$/);

    /**
     * Cross-references use opaque keys: permissions[].resource matches resources[].key,
     * roles[].tags and users[].tags reference tags[].key, roles[].permissions lists
     * permission keys, and users[].roles lists role keys.
     */
    expect(doc.permissions?.[0].resource).toBe(doc.resources?.[0].key);
    expect(doc.resources?.[0].tags).toEqual([doc.tags?.[0].key]);
    expect(doc.resources?.[0].primaryTag).toBe(doc.tags?.[0].key);
    expect(doc.permissions?.[0].tags).toEqual([doc.tags?.[0].key]);
    expect(doc.permissions?.[0].primaryTag).toBe(doc.tags?.[0].key);
    expect(doc.roles[0].tags).toEqual([doc.tags?.[0].key]);
    expect(doc.users[0].tags).toEqual([doc.tags?.[0].key]);
    expect(doc.users[0].roles).toEqual([doc.roles[0].key]);
    expect(doc.roles[0].permissions).toEqual([doc.permissions?.[0].key]);
    expect(doc.groups).toHaveLength(1);
    const exportedGroup = doc.groups![0];
    expect(exportedGroup.key).toMatch(/^cdm-group-[a-f0-9]{16}$/);
    expect(exportedGroup.name).toBe('DocumentFullAccess');
    expect(exportedGroup.permissions).toEqual([doc.permissions?.[0].key]);
    expect(doc.roles[0].groups).toEqual([exportedGroup.key]);
    expect(doc.permissions?.[0].groups).toEqual([exportedGroup.key]);

    /**
     * Grant ids must be retained for traceability under metadata.cdmSource —
     * never as identity.
     */
    expect(doc.resources?.[0].metadata).toMatchObject({ grantResourceId: A.resourceId });
    expect(doc.permissions?.[0].metadata).toMatchObject({ grantPermissionId: A.permissionId });
    expect(doc.tags?.[0].metadata).toMatchObject({ grantTagId: A.tagId });
    expect(doc.roles[0].metadata).toMatchObject({
      grantRoleId: A.roleId,
      grantGroupId: A.groupId,
    });
    expect(exportedGroup.metadata).toMatchObject({ grantGroupId: A.groupId });

    /**
     * The only Grant UUID allowed as identity is `users[].key.value` when
     * `findBy === id` (users are global by definition). Do not include those in
     * the opaque-key scan; every other CDM identity string must be opaque.
     */
    const opaqueKeyFields: string[] = [];
    for (const r of doc.resources ?? []) if (r.key) opaqueKeyFields.push(r.key);
    for (const p of doc.permissions ?? []) {
      if (p.key) opaqueKeyFields.push(p.key);
      if (p.resource) opaqueKeyFields.push(p.resource);
      for (const gk of p.groups ?? []) opaqueKeyFields.push(gk);
    }
    for (const t of doc.tags ?? []) if (t.key) opaqueKeyFields.push(t.key);
    for (const g of doc.groups ?? []) {
      if (g.key) opaqueKeyFields.push(g.key);
      for (const pk of g.permissions ?? []) opaqueKeyFields.push(pk);
    }
    for (const r of doc.roles ?? []) {
      opaqueKeyFields.push(r.key);
      for (const k of r.tags ?? []) opaqueKeyFields.push(k);
      for (const pk of r.permissions ?? []) opaqueKeyFields.push(pk);
      for (const g of r.groups ?? []) opaqueKeyFields.push(g);
    }
    for (const u of doc.users ?? []) {
      for (const rk of u.roles ?? []) opaqueKeyFields.push(rk);
      for (const k of u.tags ?? []) opaqueKeyFields.push(k);
      for (const pk of u.permissions ?? []) opaqueKeyFields.push(pk);
    }
    for (const f of opaqueKeyFields) {
      expect(f, `field "${f}" must not be a UUID`).not.toMatch(UUID_RE);
    }
  });

  it('exporter is deterministic: re-exporting the same project A data produces an identical document', async () => {
    const handlers1 = buildHandlers(buildExportRepoForProjectA());
    const handlers2 = buildHandlers(buildExportRepoForProjectA());
    const doc1 = await exportProjectA(handlers1);
    const doc2 = await exportProjectA(handlers2);
    expect(doc1).toEqual(doc2);
  });

  it('importing the exported document into project B mints fresh Grant ids and resolves every cross-reference via produced.* maps', async () => {
    const exportRepo = buildExportRepoForProjectA();
    const handlers = buildHandlers(exportRepo);
    const doc = await exportProjectA(handlers);

    /**
     * Simulate project B: real handlers re-instantiated with mocked
     * write-side dependencies. Each create* mock returns a fresh "B" id
     * distinct from project A's, proving the importer never reuses Grant
     * ids from the exported document.
     */
    const B = {
      resourceId: 'bbbb1111-0000-4000-8000-000000000001',
      permissionId: 'bbbb1111-0000-4000-8000-000000000002',
      tagId: 'bbbb1111-0000-4000-8000-000000000003',
      roleId: 'bbbb1111-0000-4000-8000-000000000004',
      groupId: 'bbbb1111-0000-4000-8000-000000000005',
    };

    const tagsService = { createTag: vi.fn().mockResolvedValue({ id: B.tagId }) };
    const projectTags = { addProjectTag: vi.fn().mockResolvedValue(undefined) };
    const tagHandler = new TagCdmEntity(
      {} as never,
      {} as never,
      tagsService as never,
      projectTags as never
    );

    const resourcesService = { createResource: vi.fn().mockResolvedValue({ id: B.resourceId }) };
    const projectResources = { addProjectResource: vi.fn().mockResolvedValue(undefined) };
    const resourceHandler = new ResourceCdmEntity(
      {} as never,
      {} as never,
      resourcesService as never,
      projectResources as never
    );

    const permissionsService = {
      createPermission: vi.fn().mockResolvedValue({ id: B.permissionId }),
    };
    const projectPermissions = { addProjectPermission: vi.fn().mockResolvedValue(undefined) };
    const permissionHandler = new PermissionCdmEntity(
      {} as never,
      {} as never,
      permissionsService as never,
      projectPermissions as never,
      { getResourceById: vi.fn().mockResolvedValue({ slug: 'documents' }) } as never
    );

    const builder = {
      createRoleWithGroup: vi.fn().mockResolvedValue({
        roleId: B.roleId,
        groupId: B.groupId,
        counts: {
          roleGroups: 1,
          groupPermissions: 1,
          projectRoles: 1,
          projectGroups: 1,
          projectPermissions: 1,
          projectResources: 0,
        },
      }),
    };
    const roleTags = { addRoleTag: vi.fn().mockResolvedValue(undefined) };
    const groupTags = { addGroupTag: vi.fn().mockResolvedValue(undefined) };
    const roleTemplateHandler = new RoleTemplateCdmEntity(
      {} as never,
      {} as never,
      builder as never,
      roleTags as never,
      groupTags as never
    );

    const projectUsers = {
      addProjectUser: vi.fn().mockResolvedValue(undefined),
      mergeProjectUserCdmMetadata: vi.fn().mockResolvedValue(undefined),
    };
    const userRoles = { addUserRole: vi.fn().mockResolvedValue(undefined) };
    const userTags = { addUserTag: vi.fn().mockResolvedValue(undefined) };
    const userAssignmentHandler = new UserAssignmentCdmEntity(
      {} as never,
      builder as never,
      projectUsers as never,
      userRoles as never,
      userTags as never
    );

    const result = {
      projectId: projectBId,
      importId: doc.id ?? null,
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
      warnings: [] as string[],
    };
    const produced = {
      roleIdsByKey: new Map<string, string>(),
      tagIds: new Map<string, string>(),
      resourceIds: new Map<string, string>(),
      permissionIds: new Map<string, string>(),
      userIds: new Map<string, string>(),
      groupIdsByKey: new Map<string, string>(),
    };

    /**
     * Stand-in for `lookupResolvedRef`: the orchestrator's resolution
     * order is (1) permissionKey → produced.permissionIds, (2) pre-resolved
     * map. The test document only contains permissionKey refs, so the
     * fallback is never exercised.
     */
    const lookupResolvedRef = vi.fn((ref: { permissionKey?: string | null }) => {
      const id = ref.permissionKey ? produced.permissionIds.get(ref.permissionKey) : undefined;
      if (!id) throw new Error(`Unexpected ref shape in this test: ${JSON.stringify(ref)}`);
      return { id, resourceId: null };
    });

    const applyCtx = {
      projectId: projectBId,
      scope: scopeB,
      tx: { __tx: true },
      lookupResolvedRef,
      result,
      produced,
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set<string>(),
    };

    const ordered: ICdmEntityHandler[] = [
      resourceHandler,
      permissionHandler,
      tagHandler,
      roleTemplateHandler,
      userAssignmentHandler,
    ];

    const expanded = expandCdmSyncInput(doc);

    /**
     * Run apply in registry order. Each handler reads the slice for its
     * inputKey from the expanded CDM payload (internal handler slice names).
     */
    for (const handler of ordered) {
      const key = handler.inputKey as keyof typeof expanded;
      const slice = expanded[key];
      if (!Array.isArray(slice)) continue;
      await handler.apply(applyCtx as never, slice as never);
    }

    expect(produced.resourceIds.get(doc.resources?.[0].key ?? '')).toBe(B.resourceId);
    expect(produced.permissionIds.get(doc.permissions?.[0].key ?? '')).toBe(B.permissionId);
    expect(produced.tagIds.get(doc.tags?.[0].key ?? '')).toBe(B.tagId);
    expect(produced.roleIdsByKey.get(doc.roles[0].key)).toBe(B.roleId);

    expect(result.resourcesCreated).toBe(1);
    expect(result.permissionsCreated).toBe(1);
    expect(result.tagsCreated).toBe(1);
    expect(result.rolesCreated).toBe(1);
    expect(result.groupsCreated).toBe(1);

    /**
     * Cross-handler wiring on the write side: project B's role gets the new
     * project B tag id, and project B's group gets the same; project B's
     * user_tags row references the new project B tag; the role-template's
     * permission_ref resolved against the freshly minted permission id.
     */
    expect(roleTags.addRoleTag).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: B.roleId, tagId: B.tagId }),
      applyCtx.tx
    );
    expect(groupTags.addGroupTag).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: B.groupId, tagId: B.tagId }),
      applyCtx.tx
    );
    expect(userTags.addUserTag).toHaveBeenCalledWith(
      expect.objectContaining({ userId, tagId: B.tagId }),
      applyCtx.tx
    );

    /**
     * The fresh project B ids must be different from project A's. This is the
     * cleanest assertion that "no Grant UUIDs leak" — the importer minted new
     * rows even though the document carried project A's ids inside metadata.
     */
    const allValues: string[] = [];
    collectAllStringValues(produced.resourceIds, allValues);
    collectAllStringValues(produced.permissionIds, allValues);
    collectAllStringValues(produced.tagIds, allValues);
    expect(allValues).not.toContain(A.resourceId);
    expect(allValues).not.toContain(A.permissionId);
    expect(allValues).not.toContain(A.tagId);
  });

  it('export encodes catalog permission grants as slug:action when no CDM permission keys exist', async () => {
    const catalogRoleId = 'f0000000-0000-4000-8000-0000000000aa';
    const catalogGroupId = 'f0000000-0000-4000-8000-0000000000bb';
    const exportRepo = {
      getProjectLinkedResourcesForExport: vi.fn().mockResolvedValue([]),
      getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([]),
      getProjectResourceTagsForExport: vi.fn().mockResolvedValue([]),
      getProjectPermissionTagsForExport: vi.fn().mockResolvedValue([]),
      getProjectTagDefinitions: vi.fn().mockResolvedValue([]),
      getProjectRolesWithPermissions: vi.fn().mockResolvedValue([
        {
          roleId: catalogRoleId,
          name: 'CatalogRole',
          description: null,
          permissions: [
            {
              permissionId: 'catalog-perm-1',
              resourceSlug: 'Documents',
              action: 'Read',
              condition: null,
            },
          ],
          metadata: {},
        },
      ]),
      getRoleTagsByRoleIds: vi.fn().mockResolvedValue([]),
      getGroupTagsByGroupIds: vi.fn().mockResolvedValue([]),
      getCdmGroupIdsForRoleIds: vi
        .fn()
        .mockResolvedValue(new Map([[catalogRoleId, catalogGroupId]])),
      getGroupsByIds: vi
        .fn()
        .mockResolvedValue([{ groupId: catalogGroupId, name: 'CatalogGroup', description: null }]),
      getGroupPermissionIdsByGroupIds: vi.fn().mockResolvedValue([]),
      getProjectUsersWithRoleIds: vi.fn().mockResolvedValue([]),
      getProjectUserDirectPermissions: vi.fn().mockResolvedValue([]),
      getProjectUserDirectGroups: vi.fn().mockResolvedValue([]),
      getUserTagsByUserIds: vi.fn().mockResolvedValue([]),
      getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
    };
    const handlers = buildHandlers(exportRepo as never);
    const doc = await exportProjectA(handlers);

    expect(doc.resources).toHaveLength(0);
    expect(doc.permissions).toHaveLength(0);
    expect(doc.roles).toHaveLength(1);
    expect(doc.roles[0].permissions).toEqual(['documents:read']);

    const expanded = expandCdmSyncInput(doc);
    expect(expanded.roleTemplates[0].permissionRefs).toEqual([
      expect.objectContaining({
        resourceSlug: 'documents',
        action: 'read',
        permissionKey: null,
      }),
    ]);
  });

  it('partial export assembly with tags slice only omits roles', async () => {
    const exportRepo = buildExportRepoForProjectA();
    const handlers = buildHandlers(exportRepo);
    const ctx: CdmExportContext = { projectId: projectAId, scope: scopeA };
    const tagsOnly = await handlers.tag.export(ctx);
    const assembled = assembleExportedSyncProjectInput({
      roleTemplates: [],
      userAssignments: [],
      projectUserApiKeys: [],
      provisionedUsers: [],
      resourcesSlice: [],
      permissionsSlice: [],
      tagsSlice: tagsOnly ?? [],
    });

    expect(assembled.tags).toHaveLength(1);
    expect(assembled.roles).toHaveLength(0);
    expect(assembled.resources).toHaveLength(0);
    expect(assembled.permissions).toHaveLength(0);
  });

  it('merge re-import validate path does not invoke handler teardown', async () => {
    const exportRepo = buildExportRepoForProjectA();
    const handlers = buildHandlers(exportRepo);
    const doc = await exportProjectA(handlers);
    const teardownSpy = vi.spyOn(handlers.roleTemplate, 'teardown');

    const expanded = expandCdmSyncInput(doc);
    expect(expanded.mode?.strategy).toBe(CdmModeStrategy.Merge);

    const ordered: ICdmEntityHandler[] = [
      handlers.resource,
      handlers.permission,
      handlers.tag,
      handlers.roleTemplate,
      handlers.userAssignment,
    ];

    for (const handler of ordered) {
      const key = handler.inputKey as keyof typeof expanded;
      const slice = expanded[key];
      if (!Array.isArray(slice)) continue;
      handler.validateInput(slice as never);
    }

    expect(teardownSpy).not.toHaveBeenCalled();
    teardownSpy.mockRestore();
  });
});
