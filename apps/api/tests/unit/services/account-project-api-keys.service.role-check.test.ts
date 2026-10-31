import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey, ROLES } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { AccountProjectApiKeyService } from '@/services/account-project-api-keys.service';

const accountId = '10000000-0000-4000-8000-0000000000c1';
const roleId = '10000000-0000-4000-8000-0000000000c2';
const userId = '10000000-0000-4000-8000-0000000000c3';

function build(options: { targetRole: string; heldRoleIds: string[]; accountRoleIds?: string[] }) {
  const accountRoleRepository = {
    getAccountRoles: vi
      .fn()
      .mockResolvedValue((options.accountRoleIds ?? [roleId]).map((id) => ({ roleId: id }))),
  };
  const userRoleRepository = {
    getUserRoles: vi.fn().mockResolvedValue(options.heldRoleIds.map((id) => ({ roleId: id }))),
  };
  const roleRepository = {
    getRoles: vi.fn().mockResolvedValue({ roles: [{ id: roleId, name: options.targetRole }] }),
  };
  return new AccountProjectApiKeyService(
    {} as never,
    accountRoleRepository as never,
    {} as never,
    userRoleRepository as never,
    roleRepository as never,
    { userId } as never,
    {} as never
  );
}

const standardAccountRole = ROLES[RoleKey.OrganizationAccountOwner].name;

describe('AccountProjectApiKeyService role check', () => {
  it('refuses a supplied role outside the standard roles', async () => {
    const service = build({ targetRole: 'a custom role', heldRoleIds: [roleId] });

    await expect(
      service.validateAccountProjectApiKeyRolePermission(accountId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses a standard organization role, which is not an account role', async () => {
    const service = build({
      targetRole: ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationViewer].name,
      heldRoleIds: [roleId],
    });

    await expect(
      service.validateAccountProjectApiKeyRolePermission(accountId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses a standard account role the caller does not hold', async () => {
    const service = build({ targetRole: standardAccountRole, heldRoleIds: [] });

    await expect(
      service.validateAccountProjectApiKeyRolePermission(accountId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('passes a supplied standard account role the caller holds', async () => {
    const service = build({ targetRole: standardAccountRole, heldRoleIds: [roleId] });

    await expect(
      service.validateAccountProjectApiKeyRolePermission(accountId, roleId)
    ).resolves.toBeUndefined();
  });

  it('refuses a caller without a user id', async () => {
    const service = new AccountProjectApiKeyService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      null,
      {} as never
    );

    await expect(
      service.validateAccountProjectApiKeyRolePermission(accountId, roleId)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
