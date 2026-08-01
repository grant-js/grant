import type { IAuditLogger, IEventPublisher, IRoleRepository } from '@grantjs/core';
import type { Role } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { RoleService } from '@/services/roles.service';

const roleId = '10000000-0000-4000-8000-000000000010';
const orgId = '10000000-0000-4000-8000-000000000011';

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: roleId,
    name: 'Developer',
    description: 'Dev role',
    metadata: {},
    groupCount: 0,
    permissionCount: 0,
    tagCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildService(repositoryOverrides: Partial<IRoleRepository> = {}) {
  let current = role();
  const roleRepository = {
    getRoles: vi.fn().mockImplementation(async () => ({
      roles: [current],
      totalCount: 1,
      hasNextPage: false,
    })),
    updateRole: vi.fn().mockImplementation(async (_id, input) => {
      current = role({
        ...current,
        ...(typeof input.name === 'string' ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(typeof input.searchDocument === 'string'
          ? { searchDocument: input.searchDocument }
          : {}),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      return current;
    }),
    createRole: vi.fn(),
    softDeleteRole: vi.fn(),
    hardDeleteRole: vi.fn(),
    ...repositoryOverrides,
  } as unknown as IRoleRepository;

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
    service: new RoleService(roleRepository, audit, events),
    roleRepository,
    events,
  };
}

describe('RoleService IAM events', () => {
  it('publishes role.updated after a successful update', async () => {
    const { service, events } = buildService();

    await service.updateRole(roleId, {
      scope: { tenant: Tenant.Organization, id: orgId },
      name: 'Senior Developer',
    });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'role.updated',
        aggregate: { kind: 'role', id: roleId },
        data: expect.objectContaining({
          before: expect.objectContaining({ id: roleId, name: 'Developer' }),
          after: expect.objectContaining({ id: roleId, name: 'Senior Developer' }),
          delta: expect.any(Object),
        }),
      }),
      undefined
    );
  });
});
