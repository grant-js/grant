import type { IAuditLogger, IEventPublisher, IPermissionRepository } from '@grantjs/core';
import type { Permission } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { PermissionService } from '@/services/permissions.service';

const permissionId = '10000000-0000-4000-8000-000000000002';
const projectA = '10000000-0000-4000-8000-00000000000a';
const projectB = '10000000-0000-4000-8000-00000000000b';

function permission(): Permission {
  return {
    id: permissionId,
    name: 'Documents: read',
    description: null,
    action: 'read',
    resourceId: '10000000-0000-4000-8000-000000000001',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as Permission;
}

function buildService(resolved: string[] = []) {
  const permissionRepository = {
    getPermissions: vi.fn().mockResolvedValue({
      permissions: [permission()],
      totalCount: 1,
      hasNextPage: false,
    }),
    softDeletePermission: vi.fn().mockResolvedValue(permission()),
    hardDeletePermission: vi.fn().mockResolvedValue(permission()),
  } as unknown as IPermissionRepository;
  const audit = {
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;
  const events = {
    publish: vi.fn(),
    resolveLinkedProjectIds: vi.fn().mockResolvedValue(resolved),
  } as unknown as IEventPublisher;
  return { service: new PermissionService(permissionRepository, audit, events), events };
}

describe('PermissionService.deletePermission project links', () => {
  it('publishes permission.deleted with the projects a caller read before it unlinked them', async () => {
    // Nothing is linked any more when the service reads: the caller already removed the rows.
    const { service, events } = buildService([]);

    await service.deletePermission({ id: permissionId, linkedProjectIds: [projectA, projectB] });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'permission.deleted',
        aggregate: { kind: 'permission', id: permissionId },
        projectIds: [projectA, projectB],
      }),
      undefined
    );
  });

  it('still publishes the links it reads itself when the caller passes none', async () => {
    const { service, events } = buildService([projectB]);

    await service.deletePermission({ id: permissionId });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'permission.deleted', projectIds: [projectB] }),
      undefined
    );
  });
});
