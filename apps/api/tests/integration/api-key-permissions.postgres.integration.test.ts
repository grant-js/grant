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
  apiKeyPermissions,
  apiKeys,
  permissions,
  projects,
  resources,
  schema,
  users,
} from '@grantjs/database';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ApiKeyPermissionRepository } from '@/repositories/api-key-permissions.repository';
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
