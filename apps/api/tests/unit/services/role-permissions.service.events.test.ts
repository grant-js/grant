import type {
  IAuditLogger,
  IEventPublisher,
  IPermissionRepository,
  IRolePermissionRepository,
  IRoleRepository,
} from '@grantjs/core';
import type { RolePermission } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { RolePermissionService } from '@/services/role-permissions.service';

const roleId = '10000000-0000-4000-8000-000000000020';
const permissionId = '10000000-0000-4000-8000-000000000021';
const rolePermissionId = '10000000-0000-4000-8000-000000000022';
const orgId = '10000000-0000-4000-8000-000000000023';

function rolePermission(overrides: Partial<RolePermission> = {}): RolePermission {
  return {
    id: rolePermissionId,
    roleId,
    permissionId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildService() {
  const roleRepository = {
    getRoles: vi.fn().mockResolvedValue({
      roles: [{ id: roleId }],
      totalCount: 1,
      hasNextPage: false,
    }),
  } as unknown as IRoleRepository;

  const permissionRepository = {
    getPermissions: vi.fn().mockResolvedValue({
      permissions: [{ id: permissionId }],
      totalCount: 1,
      hasNextPage: false,
    }),
  } as unknown as IPermissionRepository;

  const rolePermissionRepository = {
    getRolePermissions: vi.fn().mockResolvedValue([]),
    addRolePermission: vi.fn().mockResolvedValue(rolePermission()),
    softDeleteRolePermission: vi.fn(),
    hardDeleteRolePermission: vi.fn(),
    countRolePermissionsByRoleIds: vi.fn(),
  } as unknown as IRolePermissionRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  return {
    service: new RolePermissionService(
      roleRepository,
      permissionRepository,
      rolePermissionRepository,
      audit,
      events
    ),
    events,
  };
}

describe('RolePermissionService IAM events', () => {
  it('publishes role.permission_assigned after a successful assign', async () => {
    const { service, events } = buildService();

    await service.assignRolePermission({
      roleId,
      permissionId,
      scope: { tenant: Tenant.Organization, id: orgId },
    });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'role.permission_assigned',
        aggregate: { kind: 'rolePermission', id: rolePermissionId },
        data: {
          after: expect.objectContaining({
            id: rolePermissionId,
            roleId,
            permissionId,
          }),
        },
      }),
      undefined
    );
  });
});
