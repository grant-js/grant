/**
 * The role of a project API key pivot row is optional: a key that carries permissions has
 * none, and the tenant check runs only for a role that is given.
 */
import { describe, expect, it, vi } from 'vitest';

import { BadRequestError } from '@/lib/errors';
import { AccountProjectApiKeyService } from '@/services/account-project-api-keys.service';
import { OrganizationProjectApiKeyService } from '@/services/organization-project-api-keys.service';

const tenantId = '10000000-0000-4000-8000-0000000000b1';
const projectId = '10000000-0000-4000-8000-0000000000b2';
const apiKeyId = '10000000-0000-4000-8000-0000000000b3';
const roleId = '10000000-0000-4000-8000-0000000000b4';
const now = new Date('2026-01-01T00:00:00.000Z');

const row = (tenantColumn: string, column: string, role: string | null) => ({
  id: '10000000-0000-4000-8000-0000000000b6',
  [tenantColumn]: tenantId,
  projectId,
  apiKeyId,
  [column]: role,
  createdAt: now,
  updatedAt: now,
});

function buildOrganization(heldRoleIds: string[]) {
  const repository = {
    addOrganizationProjectApiKey: vi
      .fn()
      .mockImplementation(async (params) =>
        row('organizationId', 'organizationRoleId', params.organizationRoleId)
      ),
  };
  const roles = {
    getOrganizationRoles: vi.fn().mockResolvedValue(heldRoleIds.map((id) => ({ roleId: id }))),
  };
  const service = new OrganizationProjectApiKeyService(
    { getOrganizationProjects: vi.fn().mockResolvedValue([{ projectId }]) } as never,
    roles as never,
    repository as never,
    { logCreate: vi.fn() } as never
  );
  return { service, repository, roles };
}

function buildAccount(heldRoleIds: string[]) {
  const repository = {
    addAccountProjectApiKey: vi
      .fn()
      .mockImplementation(async (params) =>
        row('accountId', 'accountRoleId', params.accountRoleId)
      ),
  };
  const roles = {
    getAccountRoles: vi.fn().mockResolvedValue(heldRoleIds.map((id) => ({ roleId: id }))),
  };
  const service = new AccountProjectApiKeyService(
    { getAccountProjects: vi.fn().mockResolvedValue([{ projectId }]) } as never,
    roles as never,
    repository as never,
    {} as never,
    null,
    { logCreate: vi.fn() } as never
  );
  return { service, repository, roles };
}

describe('OrganizationProjectApiKeyService.addOrganizationProjectApiKey', () => {
  it('stores a pivot row without a role and runs no role check', async () => {
    const { service, repository, roles } = buildOrganization([]);

    const pivot = await service.addOrganizationProjectApiKey({
      organizationId: tenantId,
      projectId,
      apiKeyId,
      organizationRoleId: null,
    });

    expect(pivot.organizationRoleId).toBeNull();
    expect(roles.getOrganizationRoles).not.toHaveBeenCalled();
    expect(repository.addOrganizationProjectApiKey).toHaveBeenCalledOnce();
  });

  it('still refuses a role the organization does not have', async () => {
    const { service, repository } = buildOrganization([]);

    await expect(
      service.addOrganizationProjectApiKey({
        organizationId: tenantId,
        projectId,
        apiKeyId,
        organizationRoleId: roleId,
      })
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(repository.addOrganizationProjectApiKey).not.toHaveBeenCalled();
  });

  it('stores a role the organization has', async () => {
    const { service } = buildOrganization([roleId]);

    const pivot = await service.addOrganizationProjectApiKey({
      organizationId: tenantId,
      projectId,
      apiKeyId,
      organizationRoleId: roleId,
    });

    expect(pivot.organizationRoleId).toBe(roleId);
  });
});

describe('AccountProjectApiKeyService.addAccountProjectApiKey', () => {
  it('stores a pivot row without a role and runs no role check', async () => {
    const { service, repository, roles } = buildAccount([]);

    const pivot = await service.addAccountProjectApiKey({
      accountId: tenantId,
      projectId,
      apiKeyId,
      accountRoleId: null,
    });

    expect(pivot.accountRoleId).toBeNull();
    expect(roles.getAccountRoles).not.toHaveBeenCalled();
    expect(repository.addAccountProjectApiKey).toHaveBeenCalledOnce();
  });

  it('still refuses a role the account does not have', async () => {
    const { service, repository } = buildAccount([]);

    await expect(
      service.addAccountProjectApiKey({
        accountId: tenantId,
        projectId,
        apiKeyId,
        accountRoleId: roleId,
      })
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(repository.addAccountProjectApiKey).not.toHaveBeenCalled();
  });

  it('stores a role the account has', async () => {
    const { service } = buildAccount([roleId]);

    const pivot = await service.addAccountProjectApiKey({
      accountId: tenantId,
      projectId,
      apiKeyId,
      accountRoleId: roleId,
    });

    expect(pivot.accountRoleId).toBe(roleId);
  });
});
