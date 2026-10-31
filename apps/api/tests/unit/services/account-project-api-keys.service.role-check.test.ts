import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey, ROLES } from '@grantjs/constants';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError, NotFoundError } from '@/lib/errors';
import { AccountProjectApiKeyService } from '@/services/account-project-api-keys.service';

const accountId = '10000000-0000-4000-8000-0000000000c1';
const roleId = '10000000-0000-4000-8000-0000000000c2';
const userId = '10000000-0000-4000-8000-0000000000c3';
const projectId = '10000000-0000-4000-8000-0000000000c4';
const apiKeyId = '10000000-0000-4000-8000-0000000000c5';

function build(options: {
  targetRole: string;
  heldRoleIds: string[];
  accountRoleIds?: string[];
  duplicateRow?: boolean;
  pivot?: boolean;
}) {
  const accountRoleRepository = {
    getAccountRoles: vi
      .fn()
      .mockResolvedValue((options.accountRoleIds ?? [roleId]).map((id) => ({ roleId: id }))),
  };
  const accountProjectApiKeyRepository = {
    getByApiKeyAndAccountAndProject: vi.fn().mockResolvedValue(
      options.pivot === false
        ? null
        : {
            id: '10000000-0000-4000-8000-0000000000c6',
            accountId,
            projectId,
            apiKeyId,
            accountRoleId: roleId,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }
    ),
  };
  const userRoleRepository = {
    getUserRoles: vi.fn().mockResolvedValue(options.heldRoleIds.map((id) => ({ roleId: id }))),
  };
  const roleRepository = {
    getRoles: vi.fn().mockImplementation(async (params: { ids?: string[]; search?: string }) => {
      if (params.ids) {
        return { roles: [{ id: roleId, name: options.targetRole }] };
      }
      const rows = [{ id: roleId, name: options.targetRole }];
      if (options.duplicateRow) {
        rows.push({ id: 'row-duplicate', name: options.targetRole });
      }
      return { roles: rows };
    }),
  };
  const service = new AccountProjectApiKeyService(
    {} as never,
    accountRoleRepository as never,
    accountProjectApiKeyRepository as never,
    userRoleRepository as never,
    roleRepository as never,
    { userId } as never,
    {} as never
  );
  return service;
}

const standardAccountRole = ROLES[RoleKey.OrganizationAccountOwner].name;

describe('AccountProjectApiKeyService role check', () => {
  describe('creating a key with a supplied role', () => {
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

    it('treats a standard role name carried by more than one role row as non-standard', async () => {
      const service = build({
        targetRole: standardAccountRole,
        heldRoleIds: [roleId],
        duplicateRow: true,
      });

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

  describe('managing a key (rotate, revoke, delete)', () => {
    it('refuses a key whose role is outside the standard roles', async () => {
      const service = build({ targetRole: 'a custom role', heldRoleIds: [roleId] });

      await expect(
        service.validateCanManageAccountProjectApiKey(accountId, projectId, apiKeyId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('refuses a key whose standard account role the caller does not hold', async () => {
      const service = build({ targetRole: standardAccountRole, heldRoleIds: [] });

      await expect(
        service.validateCanManageAccountProjectApiKey(accountId, projectId, apiKeyId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('treats a standard role name carried by more than one role row as non-standard', async () => {
      const service = build({
        targetRole: standardAccountRole,
        heldRoleIds: [roleId],
        duplicateRow: true,
      });

      await expect(
        service.validateCanManageAccountProjectApiKey(accountId, projectId, apiKeyId)
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('refuses a key that does not exist in the account project', async () => {
      const service = build({
        targetRole: standardAccountRole,
        heldRoleIds: [roleId],
        pivot: false,
      });

      await expect(
        service.validateCanManageAccountProjectApiKey(accountId, projectId, apiKeyId)
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('passes a key whose standard account role the caller holds', async () => {
      const service = build({ targetRole: standardAccountRole, heldRoleIds: [roleId] });

      await expect(
        service.validateCanManageAccountProjectApiKey(accountId, projectId, apiKeyId)
      ).resolves.toBeUndefined();
    });
  });
});
