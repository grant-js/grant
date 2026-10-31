/**
 * Turning a role key into a key that carries permissions of its own clears the role on the
 * key's pivot row of its scope, and audits the change on the pivot's audit log.
 */
import { type DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/lib/errors';
import { AccountProjectApiKeyRepository } from '@/repositories/account-project-api-keys.repository';
import { OrganizationProjectApiKeyRepository } from '@/repositories/organization-project-api-keys.repository';
import { AccountProjectApiKeyService } from '@/services/account-project-api-keys.service';
import { OrganizationProjectApiKeyService } from '@/services/organization-project-api-keys.service';

const organizationId = '10000000-0000-4000-8000-0000000000c1';
const accountId = '10000000-0000-4000-8000-0000000000c2';
const projectId = '10000000-0000-4000-8000-0000000000c3';
const apiKeyId = '10000000-0000-4000-8000-0000000000c4';
const roleId = '10000000-0000-4000-8000-0000000000c5';
const pivotId = '10000000-0000-4000-8000-0000000000c6';
const dialect = new PgDialect();
const now = new Date('2026-01-01T00:00:00.000Z');

const organizationRow = (organizationRoleId: string | null) => ({
  id: pivotId,
  organizationId,
  projectId,
  apiKeyId,
  organizationRoleId,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
});
const accountRow = (accountRoleId: string | null) => ({
  id: pivotId,
  accountId,
  projectId,
  apiKeyId,
  accountRoleId,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
});

describe('OrganizationProjectApiKeyService.clearOrganizationProjectApiKeyRole', () => {
  const build = (current: ReturnType<typeof organizationRow> | null) => {
    const repository = {
      getByApiKeyAndOrganizationAndProject: vi.fn().mockResolvedValue(current),
      clearRole: vi.fn().mockResolvedValue(organizationRow(null)),
    };
    const audit = { logUpdate: vi.fn() };
    const service = new OrganizationProjectApiKeyService(
      {} as never,
      {} as never,
      repository as never,
      audit as never
    );
    return { service, repository, audit };
  };

  it('clears the role and audits the pivot row from the old role to none', async () => {
    const { service, repository, audit } = build(organizationRow(roleId));
    const tx = { __tx: true };

    const cleared = await service.clearOrganizationProjectApiKeyRole(
      { apiKeyId, organizationId, projectId },
      tx as never
    );

    expect(repository.clearRole).toHaveBeenCalledWith({ apiKeyId, organizationId, projectId }, tx);
    expect(audit.logUpdate).toHaveBeenCalledWith(
      pivotId,
      { organizationRoleId: roleId },
      { organizationRoleId: null },
      expect.any(Object),
      tx
    );
    expect(cleared.organizationRoleId).toBeNull();
  });

  it('does nothing for a key that has no role', async () => {
    const { service, repository, audit } = build(organizationRow(null));

    await service.clearOrganizationProjectApiKeyRole({ apiKeyId, organizationId, projectId });

    expect(repository.clearRole).not.toHaveBeenCalled();
    expect(audit.logUpdate).not.toHaveBeenCalled();
  });

  it('reports a key that has no pivot row in the scope as not found', async () => {
    const { service, repository } = build(null);

    await expect(
      service.clearOrganizationProjectApiKeyRole({ apiKeyId, organizationId, projectId })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.clearRole).not.toHaveBeenCalled();
  });
});

describe('AccountProjectApiKeyService.clearAccountProjectApiKeyRole', () => {
  const build = (current: ReturnType<typeof accountRow> | null) => {
    const repository = {
      getByApiKeyAndAccountAndProject: vi.fn().mockResolvedValue(current),
      clearRole: vi.fn().mockResolvedValue(accountRow(null)),
    };
    const audit = { logUpdate: vi.fn() };
    const service = new AccountProjectApiKeyService(
      {} as never,
      {} as never,
      repository as never,
      {} as never,
      null,
      audit as never
    );
    return { service, repository, audit };
  };

  it('clears the role and audits the pivot row from the old role to none', async () => {
    const { service, repository, audit } = build(accountRow(roleId));
    const tx = { __tx: true };

    const cleared = await service.clearAccountProjectApiKeyRole(
      { apiKeyId, accountId, projectId },
      tx as never
    );

    expect(repository.clearRole).toHaveBeenCalledWith({ apiKeyId, accountId, projectId }, tx);
    expect(audit.logUpdate).toHaveBeenCalledWith(
      pivotId,
      { accountRoleId: roleId },
      { accountRoleId: null },
      expect.any(Object),
      tx
    );
    expect(cleared.accountRoleId).toBeNull();
  });

  it('does nothing for a key that has no role', async () => {
    const { service, repository, audit } = build(accountRow(null));

    await service.clearAccountProjectApiKeyRole({ apiKeyId, accountId, projectId });

    expect(repository.clearRole).not.toHaveBeenCalled();
    expect(audit.logUpdate).not.toHaveBeenCalled();
  });

  it('reports a key that has no pivot row in the scope as not found', async () => {
    const { service } = build(null);

    await expect(
      service.clearAccountProjectApiKeyRole({ apiKeyId, accountId, projectId })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('the pivot repositories clear only the role of the named key and scope', () => {
  function updateChain(row: unknown) {
    const captured: { set?: Record<string, unknown>; where?: unknown } = {};
    const builder = {
      set: vi.fn((values: Record<string, unknown>) => {
        captured.set = values;
        return builder;
      }),
      where: vi.fn((condition: unknown) => {
        captured.where = condition;
        return builder;
      }),
      returning: vi.fn(async () => [row]),
    };
    return { db: { update: vi.fn(() => builder) } as unknown as DbSchema, captured };
  }

  it('sets organization_role_id to null on the live pivot row of the key in the scope', async () => {
    const { db, captured } = updateChain(organizationRow(null));

    await new OrganizationProjectApiKeyRepository(db).clearRole({
      apiKeyId,
      organizationId,
      projectId,
    });

    expect(Object.keys(captured.set!).sort()).toEqual(['organizationRoleId', 'updatedAt']);
    expect(captured.set!.organizationRoleId).toBeNull();
    const where = dialect.sqlToQuery(captured.where as never);
    expect(where.sql).toContain('"organization_project_api_keys"."organization_id" = $1');
    expect(where.sql).toContain('"organization_project_api_keys"."project_id" = $2');
    expect(where.sql).toContain('"organization_project_api_keys"."api_key_id" = $3');
    expect(where.sql).toContain('"organization_project_api_keys"."deleted_at" is null');
    expect(where.params).toEqual([organizationId, projectId, apiKeyId]);
  });

  it('sets account_role_id to null on the live pivot row of the key in the scope', async () => {
    const { db, captured } = updateChain(accountRow(null));

    await new AccountProjectApiKeyRepository(db).clearRole({ apiKeyId, accountId, projectId });

    expect(Object.keys(captured.set!).sort()).toEqual(['accountRoleId', 'updatedAt']);
    expect(captured.set!.accountRoleId).toBeNull();
    const where = dialect.sqlToQuery(captured.where as never);
    expect(where.sql).toContain('"account_project_api_keys"."account_id" = $1');
    expect(where.sql).toContain('"account_project_api_keys"."project_id" = $2');
    expect(where.sql).toContain('"account_project_api_keys"."api_key_id" = $3');
    expect(where.sql).toContain('"account_project_api_keys"."deleted_at" is null');
    expect(where.params).toEqual([accountId, projectId, apiKeyId]);
  });
});
