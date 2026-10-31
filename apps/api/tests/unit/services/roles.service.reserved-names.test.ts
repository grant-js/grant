import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '@/lib/errors';
import { RoleService } from '@/services/roles.service';

const roleId = '10000000-0000-4000-8000-0000000000e1';
const now = new Date('2026-01-01T00:00:00.000Z');

function build() {
  const roleRepository = {
    getRoles: vi.fn().mockResolvedValue({
      roles: [
        {
          id: roleId,
          name: 'Support',
          description: null,
          metadata: {},
          createdAt: now,
          updatedAt: now,
        },
      ],
    }),
    createRole: vi.fn().mockImplementation(async (params: { name: string }) => ({
      id: roleId,
      name: params.name,
      description: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    })),
    updateRole: vi.fn().mockImplementation(async (_id: string, input: { name?: string }) => ({
      id: roleId,
      name: input.name ?? 'Support',
      description: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    })),
  };
  const audit = { logCreate: vi.fn(), logUpdate: vi.fn() };
  const events = { publish: vi.fn() };
  const service = new RoleService(roleRepository as never, audit as never, events as never);
  return { service, roleRepository };
}

const reservedNames = [
  ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationViewer].name,
  'roles.names.somethingElse',
  'roles.descriptions.somethingElse',
];

describe('RoleService reserved names', () => {
  it.each(reservedNames)('refuses to create a role named %s', async (name) => {
    const { service, roleRepository } = build();

    await expect(service.createRole({ name })).rejects.toBeInstanceOf(ValidationError);

    expect(roleRepository.createRole).not.toHaveBeenCalled();
  });

  it.each(reservedNames)('refuses to rename a role to %s', async (name) => {
    const { service, roleRepository } = build();

    await expect(service.updateRole(roleId, { name } as never)).rejects.toBeInstanceOf(
      ValidationError
    );

    expect(roleRepository.updateRole).not.toHaveBeenCalled();
  });

  it('creates a role with an ordinary name', async () => {
    const { service, roleRepository } = build();

    await service.createRole({ name: 'Support' });

    expect(roleRepository.createRole).toHaveBeenCalledOnce();
  });
});
