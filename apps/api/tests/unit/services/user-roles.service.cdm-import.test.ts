import type {
  IAuditLogger,
  IEventPublisher,
  IRoleRepository,
  IUserRepository,
  IUserRoleRepository,
} from '@grantjs/core';
import { describe, expect, it, vi } from 'vitest';

import { UserRoleService } from '@/services/user-roles.service';

const userId = '30000000-0000-4000-8000-000000000099';
const viewerRoleId = '40000000-0000-4000-8000-000000000044';
const editorRoleId = '40000000-0000-4000-8000-000000000045';
const tx = { __tx: true } as never;

function build(existing: { userId: string; roleId: string }[] = []) {
  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({ users: [{ id: userId }] }),
    existsById: vi.fn(),
  };
  const roleRepository = {
    getRoles: vi.fn().mockResolvedValue({
      roles: [
        { id: viewerRoleId, name: 'viewer' },
        { id: editorRoleId, name: 'editor' },
      ],
    }),
  };
  const userRoleRepository = {
    getUserRoles: vi.fn(),
    getUserRolesByUserIds: vi.fn().mockResolvedValue(existing),
    addUserRole: vi.fn(),
    addUserRoles: vi.fn().mockImplementation(async (rows: { userId: string; roleId: string }[]) =>
      rows.map((row, index) => ({
        id: `ur-${index}`,
        userId: row.userId,
        roleId: row.roleId,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      }))
    ),
  };
  const audit = { logCreate: vi.fn() };
  const events = { publish: vi.fn() };
  const service = new UserRoleService(
    userRepository as unknown as IUserRepository,
    roleRepository as unknown as IRoleRepository,
    userRoleRepository as unknown as IUserRoleRepository,
    audit as unknown as IAuditLogger,
    events as unknown as IEventPublisher
  );
  return { service, userRoleRepository, userRepository, roleRepository, audit };
}

describe('UserRoleService.addUserRolesForCdmImport', () => {
  it('writes unique missing pairs in one repository call', async () => {
    const { service, userRoleRepository, audit } = build();

    const created = await service.addUserRolesForCdmImport(
      {
        assignments: [
          { userId, roleId: viewerRoleId },
          { userId, roleId: viewerRoleId },
          { userId, roleId: editorRoleId },
        ],
      },
      tx
    );

    expect(userRoleRepository.getUserRolesByUserIds).toHaveBeenCalledTimes(1);
    expect(userRoleRepository.addUserRole).not.toHaveBeenCalled();
    expect(userRoleRepository.addUserRoles).toHaveBeenCalledTimes(1);
    expect(userRoleRepository.addUserRoles).toHaveBeenCalledWith(
      [
        { userId, roleId: viewerRoleId },
        { userId, roleId: editorRoleId },
      ],
      tx
    );
    expect(created).toHaveLength(2);
    expect(audit.logCreate).toHaveBeenCalledTimes(2);
  });

  it('skips pairs that already exist', async () => {
    const { service, userRoleRepository } = build([{ userId, roleId: viewerRoleId }]);

    await service.addUserRolesForCdmImport(
      {
        assignments: [
          { userId, roleId: viewerRoleId },
          { userId, roleId: editorRoleId },
        ],
      },
      tx
    );

    expect(userRoleRepository.addUserRoles).toHaveBeenCalledWith(
      [{ userId, roleId: editorRoleId }],
      tx
    );
  });

  it('resolves more than 100 unique user ids in one batch', async () => {
    const userIds = Array.from(
      { length: 101 },
      (_, i) => `30000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    );
    const { service, userRepository, roleRepository, userRoleRepository } = build();
    userRepository.getUsers.mockImplementation(async (args: { ids?: string[] }) => ({
      users: (args.ids ?? []).map((id) => ({ id })),
    }));
    roleRepository.getRoles.mockImplementation(async (args: { ids?: string[] }) => ({
      roles: (args.ids ?? []).map((id) => ({ id, name: 'viewer' })),
    }));

    const created = await service.addUserRolesForCdmImport(
      { assignments: userIds.map((id) => ({ userId: id, roleId: viewerRoleId })) },
      tx
    );

    expect(userRepository.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ ids: userIds, limit: -1, unbounded: true }),
      tx
    );
    expect(created).toHaveLength(101);
    expect(userRoleRepository.addUserRoles).toHaveBeenCalledTimes(1);
    expect(userRoleRepository.addUserRoles.mock.calls[0][0]).toHaveLength(101);
  });
});
