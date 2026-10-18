import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResourceHandler } from '@/handlers/resources.handler';

const projectA = '10000000-0000-4000-8000-00000000000a';
const projectB = '10000000-0000-4000-8000-00000000000b';
const projectC = '10000000-0000-4000-8000-00000000000c';
const resourceId = '10000000-0000-4000-8000-000000000001';
const permissionId = '10000000-0000-4000-8000-000000000002';

const mockTx = {};
const mockWithTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));

// Mirrors the database: the project pivots hold their rows until a remove call drops them.
const pivots = {
  projectResources: [projectA, projectB],
  projectPermissions: [projectA, projectC],
};

const calls: string[] = [];

const mockResourceTags = {
  getResourceTags: vi.fn().mockResolvedValue([]),
};

const mockResources = {
  deleteResource: vi.fn(),
};

const mockProjectResources = {
  getProjectResourcesByResourceId: vi.fn(),
  removeProjectResource: vi.fn(),
};

const mockPermissions = {
  getPermissionsByResourceId: vi.fn(),
  deletePermission: vi.fn(),
};

const mockPermissionTags = { getPermissionTags: vi.fn().mockResolvedValue([]) };
const mockGroupPermissions = {
  getGroupPermissions: vi.fn().mockResolvedValue([]),
  removeGroupPermission: vi.fn(),
};
const mockOrganizationPermissions = {
  getOrganizationPermissions: vi.fn().mockResolvedValue([]),
};
const mockProjectPermissions = {
  getProjectPermissions: vi.fn(),
  removeProjectPermission: vi.fn(),
};

const mockCache = {
  resources: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  permissions: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  groups: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  roles: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  users: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  tags: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  projects: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  projectApps: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
  apiKeys: { addIdToCache: vi.fn(), removeIdFromCache: vi.fn(), clear: vi.fn() },
} as never;

const mockScopeServices = {
  accountProjects: {},
  organizationProjects: {},
  organizationRoles: {},
  projectRoles: {},
  userRoles: {},
  organizationUsers: {},
  projectUsers: {},
  organizationGroups: {},
  projectGroups: {},
  organizationPermissions: {},
  projectPermissions: {},
  projectResources: {},
  projectApps: {},
  accountTags: {},
  organizationTags: {},
  projectTags: {},
  projectUserApiKeys: {},
  accountProjectApiKeys: {},
  organizationProjectApiKeys: {},
} as never;

const mockDb = { withTransaction: mockWithTransaction };

function createHandler(): ResourceHandler {
  const handler = new ResourceHandler(
    mockResourceTags as never,
    mockResources as never,
    mockProjectResources as never,
    mockPermissions as never,
    mockPermissionTags as never,
    mockGroupPermissions as never,
    mockOrganizationPermissions as never,
    mockProjectPermissions as never,
    mockCache,
    mockScopeServices,
    mockDb as never
  );
  vi.spyOn(
    handler as never as { removeResourceIdFromScopeCache: () => Promise<void> },
    'removeResourceIdFromScopeCache'
  ).mockResolvedValue();
  return handler;
}

describe('ResourceHandler.deleteResource project links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    pivots.projectResources = [projectA, projectB];
    pivots.projectPermissions = [projectA, projectC];

    mockProjectResources.getProjectResourcesByResourceId.mockImplementation(async () =>
      pivots.projectResources.map((projectId) => ({ projectId, resourceId }))
    );
    mockProjectResources.removeProjectResource.mockImplementation(
      async ({ projectId }: { projectId: string }) => {
        calls.push('unlink-resource');
        pivots.projectResources = pivots.projectResources.filter((id) => id !== projectId);
      }
    );
    mockPermissions.getPermissionsByResourceId.mockResolvedValue([{ id: permissionId }]);
    mockProjectPermissions.getProjectPermissions.mockImplementation(async () =>
      pivots.projectPermissions.map((projectId) => ({ projectId, permissionId }))
    );
    mockProjectPermissions.removeProjectPermission.mockImplementation(
      async ({ projectId }: { projectId: string }) => {
        calls.push('unlink-permission');
        pivots.projectPermissions = pivots.projectPermissions.filter((id) => id !== projectId);
      }
    );
    // The real services read the pivots themselves; what is left at that point is what they see.
    mockPermissions.deletePermission.mockImplementation(async () => {
      calls.push(`delete-permission(left: ${pivots.projectPermissions.length})`);
      return { id: permissionId };
    });
    mockResources.deleteResource.mockImplementation(async () => {
      calls.push(`delete-resource(left: ${pivots.projectResources.length})`);
      return { id: resourceId };
    });
  });

  it('hands the resource service the projects it was linked to before the links were removed', async () => {
    await createHandler().deleteResource({
      id: resourceId,
      scope: { tenant: Tenant.Organization, id: 'org-id' },
    } as never);

    // The pivots are empty by the time the service runs, so only the hint can carry them.
    expect(calls).toContain('delete-resource(left: 0)');
    expect(mockResources.deleteResource).toHaveBeenCalledWith(
      expect.objectContaining({ id: resourceId, linkedProjectIds: [projectA, projectB] }),
      mockTx
    );
  });

  it('hands the permission service the projects the permission was linked to before they were removed', async () => {
    await createHandler().deleteResource({
      id: resourceId,
      scope: { tenant: Tenant.Organization, id: 'org-id' },
      hardDelete: true,
    } as never);

    expect(calls).toContain('delete-permission(left: 0)');
    expect(mockPermissions.deletePermission).toHaveBeenCalledWith(
      { id: permissionId, hardDelete: true, linkedProjectIds: [projectA, projectC] },
      mockTx
    );
  });

  it('removes the group pivots of a permission before its project_permissions rows', async () => {
    mockGroupPermissions.getGroupPermissions.mockResolvedValueOnce([
      { groupId: 'group-1', permissionId },
    ]);
    mockGroupPermissions.removeGroupPermission.mockImplementation(async () => {
      calls.push('unlink-group-permission');
    });

    await createHandler().deleteResource({
      id: resourceId,
      scope: { tenant: Tenant.Organization, id: 'org-id' },
    } as never);

    expect(calls.indexOf('unlink-group-permission')).toBeLessThan(
      calls.indexOf('unlink-permission')
    );
  });
});
