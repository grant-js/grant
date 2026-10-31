/**
 * The permissions a project API key carries (`api_key_permissions`) against a real
 * PostgreSQL: the partial unique index over live rows, the soft removal, the cascades and the
 * project row-level policy are behaviour of the database, which a mocked driver cannot show.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (`pnpm --filter @grantjs/database db:migrate`, which also grants the RLS restricted role to
 * the login role). It writes its own rows and removes them. Without the variable the whole
 * file is skipped, so `pnpm test` stays database-free.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/api-key-permissions.postgres.integration.test.ts
 */
import {
  accountProjectApiKeys,
  accountProjects,
  accounts,
  apiKeyPermissions,
  apiKeys,
  organizationProjectApiKeys,
  organizations,
  permissions,
  projects,
  resources,
  schema,
  users,
} from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ApiKeyPermissionRepository } from '@/repositories/api-key-permissions.repository';
import { GrantRepository } from '@/repositories/grant.repository';
import { PermissionRepository } from '@/repositories/permissions.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;

describe.skipIf(!url)('API key permissions on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const repository = new ApiKeyPermissionRepository(db);
  const permissionRepository = new PermissionRepository(db);

  const tag = Date.now().toString(36);
  const slug = `ApiKeyPermissionsTest${tag}`;
  let userId: string;
  let projectA: string;
  let projectB: string;
  let resourceId: string;
  let permissionIds: string[];
  let keyA: string;
  let keyB: string;

  beforeAll(async () => {
    [{ id: userId }] = await db
      .insert(users)
      .values({ name: `key-permissions-${tag}` })
      .returning({ id: users.id });
    const insertedProjects = await db
      .insert(projects)
      .values([
        { name: 'key-permissions-a', slug: `key-permissions-a-${tag}` },
        { name: 'key-permissions-b', slug: `key-permissions-b-${tag}` },
      ])
      .returning({ id: projects.id });
    [projectA, projectB] = insertedProjects.map((p) => p.id);
    [{ id: resourceId }] = await db
      .insert(resources)
      .values({ name: slug, slug, actions: ['Query', 'Update', 'Delete'] })
      .returning({ id: resources.id });
    const insertedPermissions = await db
      .insert(permissions)
      .values(
        ['Query', 'Update', 'Delete'].map((action) => ({
          name: `${slug} ${action}`,
          action,
          resourceId,
        }))
      )
      .returning({ id: permissions.id });
    permissionIds = insertedPermissions.map((p) => p.id);
    const insertedKeys = await db
      .insert(apiKeys)
      .values(
        [0, 1].map((n) => ({
          clientId: `key-permissions-${tag}-${n}`,
          clientSecretHash: 'x'.repeat(60),
          createdBy: userId,
        }))
      )
      .returning({ id: apiKeys.id });
    [keyA, keyB] = insertedKeys.map((k) => k.id);
  });

  afterAll(async () => {
    await db.delete(apiKeys).where(inArray(apiKeys.id, [keyA, keyB]));
    await db.delete(permissions).where(eq(permissions.resourceId, resourceId));
    await db.delete(resources).where(eq(resources.id, resourceId));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db.delete(users).where(eq(users.id, userId));
    await client.end();
  });

  const live = async (apiKeyId: string) =>
    (await repository.listForKey(apiKeyId)).map((row) => row.permissionId).sort();

  it('adds permissions once, lists them and ignores a repeat', async () => {
    const [query, update] = permissionIds;

    expect(
      await repository.addForKey({
        apiKeyId: keyA,
        projectId: projectA,
        permissionIds: [query, update, query],
      })
    ).toHaveLength(2);
    expect(
      await repository.addForKey({ apiKeyId: keyA, projectId: projectA, permissionIds: [query] })
    ).toEqual([]);

    expect(await live(keyA)).toEqual([query, update].sort());
  });

  it('removes softly, so the same permission can be attached again', async () => {
    const [query, update] = permissionIds;

    expect(await repository.removeForKey({ apiKeyId: keyA, permissionIds: [update] })).toEqual([
      update,
    ]);
    expect(await live(keyA)).toEqual([query]);
    expect(await repository.removeForKey({ apiKeyId: keyA, permissionIds: [update] })).toEqual([]);

    await repository.addForKey({ apiKeyId: keyA, projectId: projectA, permissionIds: [update] });
    expect(await live(keyA)).toEqual([query, update].sort());

    const rows = await db
      .select({ deletedAt: apiKeyPermissions.deletedAt })
      .from(apiKeyPermissions)
      .where(eq(apiKeyPermissions.apiKeyId, keyA));
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.deletedAt !== null)).toHaveLength(1);
  });

  it('replaces the set and reports what changed', async () => {
    const [query, update, remove] = permissionIds;

    const result = await repository.replaceForKey({
      apiKeyId: keyA,
      projectId: projectA,
      permissionIds: [query, remove],
    });

    expect(result.added).toEqual([remove]);
    expect(result.removed).toEqual([update]);
    expect(await live(keyA)).toEqual([query, remove].sort());
  });

  it('rejects a second live row for the same key and permission', async () => {
    await expect(
      db
        .insert(apiKeyPermissions)
        .values({ apiKeyId: keyA, projectId: projectA, permissionId: permissionIds[0] })
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('resolves live permission rows by id and by resource and action', async () => {
    const [query, update] = permissionIds;

    const byId = await permissionRepository.getPermissionRefsByIds([
      query,
      update,
      crypto.randomUUID(),
    ]);
    expect(byId.map((ref) => ref.id).sort()).toEqual([query, update].sort());
    expect(byId.every((ref) => ref.resource === slug)).toBe(true);

    const byAction = await permissionRepository.getPermissionRefsByActions([
      { resource: slug.toUpperCase(), action: 'QUERY' },
    ]);
    expect(byAction.map((ref) => ref.id)).toEqual([query]);
  });

  it('applies the project row-level policy to the restricted role, like the sibling pivots', async () => {
    await repository.addForKey({
      apiKeyId: keyB,
      projectId: projectB,
      permissionIds: [permissionIds[0]],
    });

    const visibleProjects = async (currentProjectId: string) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE grant_app_restricted`);
        await tx.execute(
          sql`SELECT set_config('app.current_project_id', ${currentProjectId}, true)`
        );
        const rows = await tx
          .select({ projectId: apiKeyPermissions.projectId })
          .from(apiKeyPermissions)
          .where(inArray(apiKeyPermissions.apiKeyId, [keyA, keyB]));
        return [...new Set(rows.map((r) => r.projectId))].sort();
      });

    expect(await visibleProjects(projectA)).toEqual([projectA]);
    expect(await visibleProjects(projectB)).toEqual([projectB]);
    // Unscoped requests see every row, which is the sibling policy's behaviour too.
    expect(await visibleProjects('')).toEqual([projectA, projectB].sort());
  });

  it('removes a key permissions with the key', async () => {
    await db.delete(apiKeys).where(eq(apiKeys.id, keyB));

    expect(await live(keyB)).toEqual([]);
    const rows = await db
      .select({ id: apiKeyPermissions.id })
      .from(apiKeyPermissions)
      .where(eq(apiKeyPermissions.apiKeyId, keyB));
    expect(rows).toEqual([]);
  });
});

describe.skipIf(!url)('Resolving the permissions of a project key on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const grants = new GrantRepository(db);
  const repository = new ApiKeyPermissionRepository(db);

  const tag = `${Date.now().toString(36)}r`;
  let userId: string;
  let projectA: string;
  let projectB: string;
  let organizationA: string;
  let organizationB: string;
  let accountId: string;
  let resourceId: string;
  let permissionIds: string[];
  let organizationKey: string;
  let accountKey: string;
  let strayKey: string;

  const organizationScope = (organizationId: string, projectId: string) => ({
    tenant: Tenant.OrganizationProject,
    id: `${organizationId}:${projectId}`,
  });
  const accountScope = (account: string, projectId: string) => ({
    tenant: Tenant.AccountProject,
    id: `${account}:${projectId}`,
  });
  const resolve = async (
    apiKeyId: string,
    scope: { tenant: Tenant; id: string }
  ): Promise<string[]> => (await grants.getPermissionIdsForApiKey(apiKeyId, scope)).sort();

  beforeAll(async () => {
    [{ id: userId }] = await db
      .insert(users)
      .values({ name: `key-resolution-${tag}` })
      .returning({ id: users.id });
    [projectA, projectB] = (
      await db
        .insert(projects)
        .values([
          { name: 'key-resolution-a', slug: `key-resolution-a-${tag}` },
          { name: 'key-resolution-b', slug: `key-resolution-b-${tag}` },
        ])
        .returning({ id: projects.id })
    ).map((row) => row.id);
    [organizationA, organizationB] = (
      await db
        .insert(organizations)
        .values([
          { name: 'key-resolution-org-a', slug: `key-resolution-org-a-${tag}` },
          { name: 'key-resolution-org-b', slug: `key-resolution-org-b-${tag}` },
        ])
        .returning({ id: organizations.id })
    ).map((row) => row.id);
    [{ id: accountId }] = await db
      .insert(accounts)
      .values({ ownerId: userId, type: 'personal' })
      .returning({ id: accounts.id });
    await db.insert(accountProjects).values({ accountId, projectId: projectB });
    [{ id: resourceId }] = await db
      .insert(resources)
      .values({ name: `Resolution${tag}`, slug: `Resolution${tag}`, actions: ['Query', 'Update'] })
      .returning({ id: resources.id });
    permissionIds = (
      await db
        .insert(permissions)
        .values(
          ['Query', 'Update'].map((action) => ({
            name: `Resolution${tag} ${action}`,
            action,
            resourceId,
          }))
        )
        .returning({ id: permissions.id })
    ).map((row) => row.id);
    [organizationKey, accountKey, strayKey] = (
      await db
        .insert(apiKeys)
        .values(
          [0, 1, 2].map((n) => ({
            clientId: `key-resolution-${tag}-${n}`,
            clientSecretHash: 'x'.repeat(60),
            createdBy: userId,
          }))
        )
        .returning({ id: apiKeys.id })
    ).map((row) => row.id);

    await db.insert(organizationProjectApiKeys).values({
      organizationId: organizationA,
      projectId: projectA,
      apiKeyId: organizationKey,
      organizationRoleId: null,
    });
    await db.insert(accountProjectApiKeys).values({
      accountId,
      projectId: projectB,
      apiKeyId: accountKey,
      accountRoleId: null,
    });
    await repository.addForKey({
      apiKeyId: organizationKey,
      projectId: projectA,
      permissionIds,
    });
    await repository.addForKey({
      apiKeyId: accountKey,
      projectId: projectB,
      permissionIds: [permissionIds[0]],
    });
    // Permission rows with no pivot row at all: nothing may resolve from them.
    await repository.addForKey({ apiKeyId: strayKey, projectId: projectA, permissionIds });
  });

  afterAll(async () => {
    await db.delete(apiKeys).where(inArray(apiKeys.id, [organizationKey, accountKey, strayKey]));
    await db.delete(permissions).where(eq(permissions.resourceId, resourceId));
    await db.delete(resources).where(eq(resources.id, resourceId));
    await db.delete(accountProjects).where(eq(accountProjects.accountId, accountId));
    await db.delete(accounts).where(eq(accounts.id, accountId));
    await db.delete(organizations).where(inArray(organizations.id, [organizationA, organizationB]));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db.delete(users).where(eq(users.id, userId));
    await client.end();
  });

  it('resolves the live permissions of a key through the pivot of its organization project', async () => {
    expect(await resolve(organizationKey, organizationScope(organizationA, projectA))).toEqual(
      [...permissionIds].sort()
    );
  });

  it('resolves the live permissions of a key through the pivot of its account project', async () => {
    expect(await resolve(accountKey, accountScope(accountId, projectB))).toEqual([
      permissionIds[0],
    ]);
  });

  it('resolves nothing for the same key id in another project or another organization', async () => {
    expect(await resolve(organizationKey, organizationScope(organizationA, projectB))).toEqual([]);
    expect(await resolve(organizationKey, organizationScope(organizationB, projectA))).toEqual([]);
  });

  it('resolves nothing across tenants: an organization key in an account scope, and the reverse', async () => {
    expect(await resolve(organizationKey, accountScope(accountId, projectA))).toEqual([]);
    expect(await resolve(accountKey, organizationScope(organizationA, projectB))).toEqual([]);
  });

  it('resolves nothing from permission rows of a key that has no pivot row in the scope', async () => {
    expect(await resolve(strayKey, organizationScope(organizationA, projectA))).toEqual([]);
    expect(await resolve(strayKey, accountScope(accountId, projectB))).toEqual([]);
  });

  it('resolves nothing in a scope that is not a project scope', async () => {
    expect(
      await resolve(organizationKey, { tenant: Tenant.Organization, id: organizationA })
    ).toEqual([]);
  });

  it('follows an edit: a removed permission is no longer resolved, and a restored one is', async () => {
    const scope = organizationScope(organizationA, projectA);

    await repository.removeForKey({ apiKeyId: organizationKey, permissionIds: [permissionIds[1]] });
    expect(await resolve(organizationKey, scope)).toEqual([permissionIds[0]]);

    await repository.addForKey({
      apiKeyId: organizationKey,
      projectId: projectA,
      permissionIds: [permissionIds[1]],
    });
    expect(await resolve(organizationKey, scope)).toEqual([...permissionIds].sort());
  });

  it('resolves nothing once the pivot row of the scope is removed', async () => {
    const scope = organizationScope(organizationA, projectA);

    await db
      .update(organizationProjectApiKeys)
      .set({ deletedAt: new Date() })
      .where(eq(organizationProjectApiKeys.apiKeyId, organizationKey));

    expect(await resolve(organizationKey, scope)).toEqual([]);
  });
});
