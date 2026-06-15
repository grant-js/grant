import {
  CdmFindBy,
  CdmModeStrategy,
  type Scope,
  type SyncProjectInput,
  Tenant,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY, CDM_SOURCE_METADATA_KEY } from '@/constants/cdm-import.constants';
import { ProjectImportService } from '@/services/project-import.service';

const accountId = '10000000-0000-4000-8000-000000000020';
const projectId = '10000000-0000-4000-8000-000000000011';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

/** Opaque keys so expand → roleTemplates get at least one permissionRef (RoleTemplateHandler.validateInput). */
const CDM_RES_KEY = 'cdm-res-metadata';
const CDM_PERM_KEY = 'cdm-perm-metadata';

describe('ProjectImportService CDM metadata', () => {
  const importRepo = {
    listCdmRoleIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmGroupIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmProjectUserApiKeyIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmTagIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmTags: vi.fn().mockResolvedValue(undefined),
    listCdmResourceIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmResources: vi.fn().mockResolvedValue(undefined),
    reviveCdmResourceAndProjectLinkForProject: vi.fn().mockResolvedValue(false),
    listCdmPermissionIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmPermissions: vi.fn().mockResolvedValue(undefined),
    resolvePermission: vi.fn().mockResolvedValue({ id: 'perm-1', resourceId: 'res-1' }),
  };
  const roles = { createRole: vi.fn(), deleteRole: vi.fn() };
  const groups = { createGroup: vi.fn(), deleteGroup: vi.fn() };
  const roleGroups = {
    getRoleGroups: vi.fn().mockResolvedValue([]),
    addRoleGroup: vi.fn(),
    removeRoleGroup: vi.fn(),
  };
  const rolePermissions = {
    getRolePermissions: vi.fn().mockResolvedValue([]),
    assignRolePermission: vi.fn(),
    revokeRolePermission: vi.fn(),
  };
  const groupPermissions = {
    getGroupPermissions: vi.fn().mockResolvedValue([]),
    addGroupPermission: vi.fn(),
    removeGroupPermission: vi.fn(),
  };
  const userPermissions = {
    getUserPermissions: vi.fn().mockResolvedValue([]),
    assignUserPermission: vi.fn(),
    revokeUserPermission: vi.fn(),
  };
  const userGroups = {
    getUserGroups: vi.fn().mockResolvedValue([]),
    addUserGroup: vi.fn(),
    removeUserGroup: vi.fn(),
  };
  const projectUserGroups = {
    getProjectUserGroups: vi.fn().mockResolvedValue([]),
    addProjectUserGroup: vi.fn(),
    removeProjectUserGroup: vi.fn(),
  };
  const projectRoles = { addProjectRole: vi.fn(), removeProjectRole: vi.fn() };
  const projectGroups = { addProjectGroup: vi.fn(), removeProjectGroup: vi.fn() };
  const projectPermissions = {
    getProjectPermissions: vi.fn().mockResolvedValue([]),
    addProjectPermission: vi.fn(),
  };
  const projectRolePermissions = {
    getProjectRolePermissions: vi.fn().mockResolvedValue([]),
    addProjectRolePermission: vi.fn(),
  };
  const projectUserPermissions = {
    getProjectUserPermissions: vi.fn().mockResolvedValue([]),
    addProjectUserPermission: vi.fn(),
  };
  const projectResources = {
    getProjectResources: vi.fn().mockResolvedValue([]),
    addProjectResource: vi.fn(),
  };
  const projectUsers = {
    addProjectUser: vi.fn(),
    mergeProjectUserCdmMetadata: vi.fn(),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
    getProjectUsers: vi.fn().mockResolvedValue([]),
  };
  const userRoles = { addUserRole: vi.fn(), removeUserRole: vi.fn(), getUserRoles: vi.fn() };
  const apiKeys = {
    deleteApiKey: vi.fn(),
    createApiKeyForCdmImport: vi.fn(),
  };
  const projectUserApiKeys = { addProjectUserApiKey: vi.fn() };

  const cache = {
    permissions: { delete: vi.fn(), keys: vi.fn().mockResolvedValue([]) },
    roles: { delete: vi.fn() },
    groups: { delete: vi.fn() },
    users: { delete: vi.fn() },
    resources: { delete: vi.fn() },
    tags: { delete: vi.fn() },
    apiKeys: { delete: vi.fn() },
  };

  const tags = { createTag: vi.fn() };
  const projectTags = { addProjectTag: vi.fn() };
  const roleTags = { addRoleTag: vi.fn() };
  const groupTags = { addGroupTag: vi.fn() };
  const userTags = { addUserTag: vi.fn() };
  const resourcesService = { createResource: vi.fn() };
  const permissionsService = { createPermission: vi.fn() };
  const resourceTags = { addResourceTag: vi.fn() };
  const permissionTags = { addPermissionTag: vi.fn() };

  function createService() {
    return new ProjectImportService(
      importRepo as never,
      roles as never,
      groups as never,
      roleGroups as never,
      rolePermissions as never,
      groupPermissions as never,
      userPermissions as never,
      userGroups as never,
      projectRoles as never,
      projectGroups as never,
      projectPermissions as never,
      projectRolePermissions as never,
      projectUserPermissions as never,
      projectUserGroups as never,
      projectResources as never,
      projectUsers as never,
      userRoles as never,
      apiKeys as never,
      projectUserApiKeys as never,
      cache as never,
      tags as never,
      projectTags as never,
      roleTags as never,
      groupTags as never,
      userTags as never,
      resourcesService as never,
      permissionsService as never,
      {} as never,
      {} as never,
      resourceTags as never,
      permissionTags as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    projectUsers.getProjectUsers.mockResolvedValue([]);
    groups.createGroup.mockResolvedValue({ id: 'group-1' });
    roles.createRole.mockResolvedValue({ id: 'role-1' });
    resourcesService.createResource.mockResolvedValue({ id: 'imported-res-1', slug: 'documents' });
    permissionsService.createPermission.mockResolvedValue({ id: 'imported-perm-1' });
    roleGroups.addRoleGroup.mockResolvedValue({});
    projectGroups.addProjectGroup.mockResolvedValue({});
    projectRoles.addProjectRole.mockResolvedValue({});
    groupPermissions.addGroupPermission.mockResolvedValue({});
    projectPermissions.addProjectPermission.mockResolvedValue({});
    projectResources.addProjectResource.mockResolvedValue({});
    projectUsers.addProjectUser.mockResolvedValue({});
    userRoles.addUserRole.mockResolvedValue({});
  });

  it('merges template metadata into role create payload (direct permissions path)', async () => {
    const input: SyncProjectInput = {
      version: 1,
      id: null,
      mode: {
        strategy: CdmModeStrategy.Merge,
        onConflict: null,
        confirmDestructive: false,
      },
      roles: [
        {
          key: 'viewer',
          name: 'Viewer',
          permissions: [CDM_PERM_KEY],
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: { legacyRoleId: 'r-9' },
        },
      ],
      users: [],
      resources: [
        {
          key: CDM_RES_KEY,
          slug: 'documents',
          name: 'Documents',
          description: null,
          actions: ['read'],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      permissions: [
        {
          key: CDM_PERM_KEY,
          resource: CDM_RES_KEY,
          action: 'read',
          name: 'Documents:read',
          description: null,
          condition: null,
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      groups: [],
      tags: [],
    };

    const svc = createService();
    await svc.importProjectCdm({ projectId, scope, input }, {});

    expect(groups.createGroup).not.toHaveBeenCalled();
    expect(rolePermissions.assignRolePermission).toHaveBeenCalledTimes(1);

    expect(roles.createRole).toHaveBeenCalledTimes(1);
    const roleMeta = roles.createRole.mock.calls[0][0].metadata as Record<string, unknown>;
    expect(roleMeta[CDM_IMPORT_METADATA_KEY]).toMatchObject({
      projectId,
      kind: 'role',
      externalKey: 'viewer',
    });
    expect(roleMeta[CDM_SOURCE_METADATA_KEY]).toEqual({ legacyRoleId: 'r-9' });
  });

  it('calls mergeProjectUserCdmMetadata when user assignment includes metadata', async () => {
    const userId = '20000000-0000-4000-8000-000000000033';
    const input: SyncProjectInput = {
      version: 1,
      id: null,
      mode: {
        strategy: CdmModeStrategy.Merge,
        onConflict: null,
        confirmDestructive: false,
      },
      roles: [
        {
          key: 'viewer',
          name: 'Viewer',
          permissions: [CDM_PERM_KEY],
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      users: [
        {
          key: { value: userId, findBy: CdmFindBy.Id },
          name: 'Member',
          roles: ['viewer'],
          groups: [],
          permissions: [],
          tags: [],
          primaryTag: null,
          apiKeys: [],
          metadata: { legacyUserId: 'u-1' },
        },
      ],
      resources: [
        {
          key: CDM_RES_KEY,
          slug: 'documents',
          name: 'Documents',
          description: null,
          actions: ['read'],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      permissions: [
        {
          key: CDM_PERM_KEY,
          resource: CDM_RES_KEY,
          action: 'read',
          name: 'Documents:read',
          description: null,
          condition: null,
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      groups: [],
      tags: [],
    };

    const svc = createService();
    await svc.importProjectCdm({ projectId, scope, input }, {});

    expect(projectUsers.mergeProjectUserCdmMetadata).toHaveBeenCalledWith(
      {
        projectId,
        userId,
        importerMetadata: { legacyUserId: 'u-1' },
      },
      {}
    );
  });

  it('invalidateCachesForImportResult clears scoped entity caches including tags and API keys', async () => {
    const expectedKey = `${scope.tenant}:${scope.id}`;
    const svc = createService();
    await svc.invalidateCachesForImportResult({ scope, userIds: [] });

    expect(cache.permissions.delete).toHaveBeenCalledWith(expectedKey);
    expect(cache.tags.delete).toHaveBeenCalledWith(expectedKey);
    expect(cache.apiKeys.delete).toHaveBeenCalledWith(expectedKey);
  });

  it('invalidateCachesForImportResult clears AccountProjectUser and ProjectUser caches for each user id', async () => {
    const userId = '898d0272-0c07-4d9b-8461-6a0c0f3c926c';
    const accountProjectUserKey = `${Tenant.AccountProjectUser}:${accountId}:${projectId}:${userId}`;
    const projectUserKey = `${Tenant.ProjectUser}:${projectId}:${userId}`;
    const svc = createService();
    await svc.invalidateCachesForImportResult({ scope, userIds: [userId] });

    expect(cache.apiKeys.delete).toHaveBeenCalledWith(`${scope.tenant}:${scope.id}`);
    expect(cache.apiKeys.delete).toHaveBeenCalledWith(accountProjectUserKey);
    expect(cache.apiKeys.delete).toHaveBeenCalledWith(projectUserKey);
  });

  it('invalidateCachesForImportResult clears composite caches for every project user', async () => {
    projectUsers.getProjectUsers.mockResolvedValue([
      { userId: 'u-extra-1' },
      { userId: 'u-extra-2' },
    ]);
    const svc = createService();
    await svc.invalidateCachesForImportResult({ scope, userIds: [] });

    expect(projectUsers.getProjectUsers).toHaveBeenCalledWith({ projectId });
    expect(cache.groups.delete).toHaveBeenCalledWith(
      `${Tenant.AccountProjectUser}:${accountId}:${projectId}:u-extra-1`
    );
    expect(cache.groups.delete).toHaveBeenCalledWith(
      `${Tenant.AccountProjectUser}:${accountId}:${projectId}:u-extra-2`
    );
  });

  it('invalidateCachesForImportResult clears OrganizationProjectUser and ProjectUser caches for each user id', async () => {
    const organizationId = '30000000-0000-4000-8000-000000000030';
    const orgScope: Scope = {
      tenant: Tenant.OrganizationProject,
      id: `${organizationId}:${projectId}`,
    };
    const userId = '898d0272-0c07-4d9b-8461-6a0c0f3c926c';
    const organizationProjectUserKey = `${Tenant.OrganizationProjectUser}:${organizationId}:${projectId}:${userId}`;
    const projectUserKey = `${Tenant.ProjectUser}:${projectId}:${userId}`;
    const svc = createService();
    await svc.invalidateCachesForImportResult({ scope: orgScope, userIds: [userId] });

    expect(cache.apiKeys.delete).toHaveBeenCalledWith(`${orgScope.tenant}:${orgScope.id}`);
    expect(cache.apiKeys.delete).toHaveBeenCalledWith(organizationProjectUserKey);
    expect(cache.apiKeys.delete).toHaveBeenCalledWith(projectUserKey);
  });

  it('rejects Replace when the document omits users[].apiKeys but CDM-managed project user API keys still exist', async () => {
    importRepo.listCdmProjectUserApiKeyIdsForProject.mockResolvedValue([
      '40000000-0000-4000-8000-000000000001',
    ]);
    const userId = '20000000-0000-4000-8000-000000000033';
    const input: SyncProjectInput = {
      version: 1,
      id: null,
      mode: {
        strategy: CdmModeStrategy.Replace,
        onConflict: null,
        confirmDestructive: true,
      },
      roles: [
        {
          key: 'viewer',
          name: 'Viewer',
          permissions: [CDM_PERM_KEY],
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      users: [
        {
          key: { value: userId, findBy: CdmFindBy.Id },
          name: 'Member',
          roles: ['viewer'],
          groups: [],
          permissions: [],
          tags: [],
          primaryTag: null,
          apiKeys: [],
          metadata: null,
        },
      ],
      resources: [
        {
          key: CDM_RES_KEY,
          slug: 'documents',
          name: 'Documents',
          description: null,
          actions: ['read'],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      permissions: [
        {
          key: CDM_PERM_KEY,
          resource: CDM_RES_KEY,
          action: 'read',
          name: 'Documents:read',
          description: null,
          condition: null,
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      groups: [],
      tags: [],
    };

    const svc = createService();
    await expect(svc.importProjectCdm({ projectId, scope, input }, {})).rejects.toThrow(
      /project user API keys without creating replacements/
    );
    expect(apiKeys.deleteApiKey).not.toHaveBeenCalled();
  });
});
