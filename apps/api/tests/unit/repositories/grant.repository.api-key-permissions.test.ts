/**
 * The permissions a project key carries are read through the key's pivot row of the named
 * project scope: the same key id in another scope, a removed pivot row and a removed permission
 * row resolve nothing.
 */
import { type DbSchema } from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { GrantRepository } from '@/repositories/grant.repository';

const organizationId = '10000000-0000-4000-8000-0000000000b1';
const accountId = '10000000-0000-4000-8000-0000000000b2';
const projectId = '10000000-0000-4000-8000-0000000000b3';
const apiKeyId = '10000000-0000-4000-8000-0000000000b4';
const dialect = new PgDialect();

function build(rows: { permissionId: string }[]) {
  const captured: { joinTable?: unknown; joinOn?: unknown; where?: unknown } = {};
  const builder = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn((table: unknown, on: unknown) => {
      captured.joinTable = table;
      captured.joinOn = on;
      return builder;
    }),
    where: vi.fn(async (condition: unknown) => {
      captured.where = condition;
      return rows;
    }),
  };
  const db = { select: vi.fn(() => builder) } as unknown as DbSchema;
  return { repository: new GrantRepository(db), captured, db };
}

describe('GrantRepository.getPermissionIdsForApiKey', () => {
  it('joins the key rows through the organization pivot of the scope, live rows only', async () => {
    const { repository, captured } = build([{ permissionId: 'p1' }, { permissionId: 'p2' }]);

    const ids = await repository.getPermissionIdsForApiKey(apiKeyId, {
      tenant: Tenant.OrganizationProject,
      id: `${organizationId}:${projectId}`,
    });

    expect(ids).toEqual(['p1', 'p2']);
    const join = dialect.sqlToQuery(captured.joinOn as never);
    expect(join.sql).toContain(
      '"organization_project_api_keys"."api_key_id" = "api_key_permissions"."api_key_id"'
    );
    expect(join.sql).toContain('"organization_project_api_keys"."organization_id" = $1');
    expect(join.sql).toContain('"organization_project_api_keys"."project_id" = $2');
    expect(join.sql).toContain('"organization_project_api_keys"."deleted_at" is null');
    expect(join.params).toEqual([organizationId, projectId]);

    const where = dialect.sqlToQuery(captured.where as never);
    expect(where.sql).toContain('"api_key_permissions"."api_key_id" = $1');
    expect(where.sql).toContain('"api_key_permissions"."project_id" = $2');
    expect(where.sql).toContain('"api_key_permissions"."deleted_at" is null');
    expect(where.params).toEqual([apiKeyId, projectId]);
  });

  it('joins through the account pivot of the scope for an account project', async () => {
    const { repository, captured } = build([{ permissionId: 'p1' }]);

    await repository.getPermissionIdsForApiKey(apiKeyId, {
      tenant: Tenant.AccountProject,
      id: `${accountId}:${projectId}`,
    });

    const join = dialect.sqlToQuery(captured.joinOn as never);
    expect(join.sql).toContain('"account_project_api_keys"."account_id" = $1');
    expect(join.sql).toContain('"account_project_api_keys"."project_id" = $2');
    expect(join.sql).toContain('"account_project_api_keys"."deleted_at" is null');
    expect(join.params).toEqual([accountId, projectId]);
  });

  it('returns each permission once', async () => {
    const { repository } = build([{ permissionId: 'p1' }, { permissionId: 'p1' }]);

    await expect(
      repository.getPermissionIdsForApiKey(apiKeyId, {
        tenant: Tenant.OrganizationProject,
        id: `${organizationId}:${projectId}`,
      })
    ).resolves.toEqual(['p1']);
  });

  it.each([
    ['organization', { tenant: Tenant.Organization, id: organizationId }],
    ['project user', { tenant: Tenant.ProjectUser, id: `${projectId}:${apiKeyId}` }],
    ['account', { tenant: Tenant.Account, id: accountId }],
  ])('reads nothing in a %s scope', async (_label, scope) => {
    const { repository, db } = build([{ permissionId: 'p1' }]);

    await expect(repository.getPermissionIdsForApiKey(apiKeyId, scope)).resolves.toEqual([]);
    expect((db as unknown as { select: unknown }).select).not.toHaveBeenCalled();
  });

  it.each([
    ['without a project', Tenant.OrganizationProject, organizationId],
    ['with an empty project', Tenant.AccountProject, `${accountId}:`],
  ])('reads nothing for a scope id %s', async (_label, tenant, id) => {
    const { repository, db } = build([{ permissionId: 'p1' }]);

    await expect(repository.getPermissionIdsForApiKey(apiKeyId, { tenant, id })).resolves.toEqual(
      []
    );
    expect((db as unknown as { select: unknown }).select).not.toHaveBeenCalled();
  });

  it('runs inside the transaction it is given', async () => {
    const { repository, db } = build([]);
    const inner = build([{ permissionId: 'p1' }]);

    await repository.getPermissionIdsForApiKey(
      apiKeyId,
      { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectId}` },
      inner.db as never
    );

    expect((inner.db as unknown as { select: unknown }).select).toHaveBeenCalledOnce();
    expect((db as unknown as { select: unknown }).select).not.toHaveBeenCalled();
  });
});
