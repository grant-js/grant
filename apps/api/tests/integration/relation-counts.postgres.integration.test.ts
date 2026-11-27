/**
 * The relationship counts the group and permission lists show, against a real PostgreSQL:
 * which rows count in a project and in an organization, that soft-deleted rows and indirect
 * assignments do not, and that the new partial indexes serve the counts.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (`pnpm --filter @grantjs/database db:migrate`). It writes its own rows and removes them.
 * Without the variable the whole file is skipped, so `pnpm test` stays database-free.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/relation-counts.postgres.integration.test.ts
 */
import {
  groupPermissions,
  groups,
  organizationGroups,
  organizations,
  organizationUsers,
  permissions,
  projects,
  projectUserGroups,
  projectUserPermissions,
  roles,
  schema,
  userGroups,
  userPermissions,
  users,
} from '@grantjs/database';
import { type Scope, Tenant } from '@grantjs/schema';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GroupPermissionRepository } from '@/repositories/group-permissions.repository';
import { UserGroupRepository } from '@/repositories/user-groups.repository';
import { UserPermissionRepository } from '@/repositories/user-permissions.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;

describe.skipIf(!url)('relationship counts on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 2, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const userGroupRepository = new UserGroupRepository(db);
  const userPermissionRepository = new UserPermissionRepository(db);
  const groupPermissionRepository = new GroupPermissionRepository(db);

  const tag = Date.now().toString(36);
  let orgUser1: string;
  let orgUser2: string;
  let outsider: string;
  let leaver: string;
  let organizationId: string;
  let projectA: string;
  let projectB: string;
  let roleId: string;
  let orgGroup: string;
  let projectGroup: string;
  let permission: string;
  let organizationScope: Scope;
  let projectAScope: Scope;

  beforeAll(async () => {
    [orgUser1, orgUser2, outsider, leaver] = (
      await db
        .insert(users)
        .values(['one', 'two', 'outsider', 'leaver'].map((n) => ({ name: `counts-${n}-${tag}` })))
        .returning({ id: users.id })
    ).map((row) => row.id);
    [{ id: organizationId }] = await db
      .insert(organizations)
      .values({ name: `counts-${tag}`, slug: `counts-${tag}` })
      .returning({ id: organizations.id });
    [projectA, projectB] = (
      await db
        .insert(projects)
        .values([
          { name: 'counts-a', slug: `counts-a-${tag}` },
          { name: 'counts-b', slug: `counts-b-${tag}` },
        ])
        .returning({ id: projects.id })
    ).map((row) => row.id);
    [{ id: roleId }] = await db
      .insert(roles)
      .values({ name: `counts-${tag}` })
      .returning({ id: roles.id });
    [orgGroup, projectGroup] = (
      await db
        .insert(groups)
        .values([{ name: `counts-org-${tag}` }, { name: `counts-project-${tag}` }])
        .returning({ id: groups.id })
    ).map((row) => row.id);
    [{ id: permission }] = await db
      .insert(permissions)
      .values({ name: `counts-${tag}`, action: 'Query' })
      .returning({ id: permissions.id });

    organizationScope = { tenant: Tenant.Organization, id: organizationId };
    projectAScope = { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectA}` };

    await db
      .insert(organizationUsers)
      .values([orgUser1, orgUser2].map((userId) => ({ organizationId, userId, roleId })));
    await db.insert(organizationGroups).values({ organizationId, groupId: orgGroup });

    // Organization group: two members, a user of no organization and a removed member.
    await db.insert(userGroups).values([
      { userId: orgUser1, groupId: orgGroup },
      { userId: orgUser2, groupId: orgGroup },
      { userId: outsider, groupId: orgGroup },
      { userId: leaver, groupId: orgGroup, deletedAt: new Date() },
    ]);

    // Project group: two members in project A, one in project B, and one whose global row is gone.
    await db.insert(userGroups).values([
      { userId: orgUser1, groupId: projectGroup },
      { userId: orgUser2, groupId: projectGroup },
      { userId: outsider, groupId: projectGroup },
      { userId: leaver, groupId: projectGroup, deletedAt: new Date() },
    ]);
    await db.insert(projectUserGroups).values([
      { projectId: projectA, userId: orgUser1, groupId: projectGroup },
      { projectId: projectA, userId: orgUser2, groupId: projectGroup },
      { projectId: projectB, userId: outsider, groupId: projectGroup },
      { projectId: projectA, userId: leaver, groupId: projectGroup },
    ]);

    // The permission: held directly by orgUser1 (also in project A), through orgGroup by the
    // group's members, and by projectGroup, which is not the organization's.
    await db.insert(userPermissions).values({ userId: orgUser1, permissionId: permission });
    await db
      .insert(projectUserPermissions)
      .values({ projectId: projectA, userId: orgUser1, permissionId: permission });
    await db.insert(groupPermissions).values([
      { groupId: orgGroup, permissionId: permission },
      { groupId: projectGroup, permissionId: permission },
    ]);
  });

  afterAll(async () => {
    await db.delete(groups).where(inArray(groups.id, [orgGroup, projectGroup]));
    await db.delete(permissions).where(inArray(permissions.id, [permission]));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db.delete(organizations).where(inArray(organizations.id, [organizationId]));
    await db.delete(roles).where(inArray(roles.id, [roleId]));
    await db.delete(users).where(inArray(users.id, [orgUser1, orgUser2, outsider, leaver]));
    await client.end();
  });

  describe('a group’s users', () => {
    it('in an organization: its live members who are the organization’s users', async () => {
      const counts = await userGroupRepository.countUsersByGroupIds([orgGroup], organizationScope);
      expect(counts.get(orgGroup)).toBe(2);
      expect(
        (
          await userGroupRepository.getUserIdsByGroupId({
            groupId: orgGroup,
            scope: organizationScope,
          })
        ).sort()
      ).toEqual([orgUser1, orgUser2].sort());
    });

    it('in a project: that project’s assignments whose global membership is live', async () => {
      const counts = await userGroupRepository.countUsersByGroupIds(
        [projectGroup, orgGroup],
        projectAScope
      );
      expect(counts.get(projectGroup)).toBe(2);
      expect(counts.has(orgGroup)).toBe(false);
      expect(
        (
          await userGroupRepository.getUserIdsByGroupId({
            groupId: projectGroup,
            scope: projectAScope,
          })
        ).sort()
      ).toEqual([orgUser1, orgUser2].sort());
    });

    it('in an account scope: none', async () => {
      const counts = await userGroupRepository.countUsersByGroupIds([orgGroup], {
        tenant: Tenant.Account,
        id: organizationId,
      });
      expect(counts.size).toBe(0);
    });
  });

  describe('a permission’s users', () => {
    it('counts the direct holder only, not the members of a group that holds it', async () => {
      expect(
        (
          await userPermissionRepository.countUsersByPermissionIds([permission], organizationScope)
        ).get(permission)
      ).toBe(1);
      expect(
        (await userPermissionRepository.countUsersByPermissionIds([permission], projectAScope)).get(
          permission
        )
      ).toBe(1);
      expect(
        await userPermissionRepository.getUserIdsByPermissionId({
          permissionId: permission,
          scope: projectAScope,
        })
      ).toEqual([orgUser1]);
    });
  });

  describe('a permission’s groups', () => {
    it('counts the groups of the scope only', async () => {
      const counts = await groupPermissionRepository.countGroupsByPermissionIds(
        [permission],
        organizationScope
      );
      expect(counts.get(permission)).toBe(1);
    });
  });

  describe('indexes', () => {
    // A project with many assignments to other groups and permissions, so the plan shows which
    // index reaches one group's rows without walking the whole project.
    const BULK = 3000;
    let bulkUsers: string[] = [];
    let bulkGroup: string;
    let bulkPermission: string;

    beforeAll(async () => {
      bulkUsers = (
        await db
          .insert(users)
          .values(Array.from({ length: BULK }, (_, i) => ({ name: `counts-bulk-${i}-${tag}` })))
          .returning({ id: users.id })
      ).map((row) => row.id);
      [{ id: bulkGroup }] = await db
        .insert(groups)
        .values({ name: `counts-bulk-${tag}` })
        .returning({ id: groups.id });
      [{ id: bulkPermission }] = await db
        .insert(permissions)
        .values({ name: `counts-bulk-${tag}`, action: 'Query' })
        .returning({ id: permissions.id });
      const rows = bulkUsers.map((userId) => ({ userId }));
      await db.insert(userGroups).values(rows.map((r) => ({ ...r, groupId: bulkGroup })));
      await db
        .insert(userPermissions)
        .values(rows.map((r) => ({ ...r, permissionId: bulkPermission })));
      await db
        .insert(projectUserGroups)
        .values(rows.map((r) => ({ ...r, projectId: projectA, groupId: bulkGroup })));
      await db
        .insert(projectUserPermissions)
        .values(rows.map((r) => ({ ...r, projectId: projectA, permissionId: bulkPermission })));
      await db.execute(
        sql`ANALYZE user_groups, user_permissions, project_user_groups, project_user_permissions, group_permissions`
      );
    });

    afterAll(async () => {
      await db.delete(groups).where(inArray(groups.id, [bulkGroup]));
      await db.delete(permissions).where(inArray(permissions.id, [bulkPermission]));
      await db.delete(users).where(inArray(users.id, bulkUsers));
    });

    const plan = async (query: ReturnType<typeof sql>) => {
      const rows = await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL enable_seqscan = off`);
        return tx.execute(sql`EXPLAIN ${query}`);
      });
      return (rows as unknown as Array<{ 'QUERY PLAN': string }>)
        .map((row) => row['QUERY PLAN'])
        .join('\n');
    };

    it.each([
      [
        'project_user_groups_project_id_group_id_idx',
        () =>
          sql`SELECT group_id, count(*) FROM project_user_groups WHERE project_id = ${projectA} AND group_id IN (${projectGroup}) AND deleted_at IS NULL GROUP BY group_id`,
      ],
      [
        'project_user_permissions_project_id_permission_id_idx',
        () =>
          sql`SELECT permission_id, count(*) FROM project_user_permissions WHERE project_id = ${projectA} AND permission_id IN (${permission}) AND deleted_at IS NULL GROUP BY permission_id`,
      ],
      [
        'group_permissions_permission_id_idx',
        () =>
          sql`SELECT permission_id, count(*) FROM group_permissions WHERE permission_id IN (${permission}) AND deleted_at IS NULL GROUP BY permission_id`,
      ],
      [
        'user_groups_group_id_idx',
        () =>
          sql`SELECT group_id, count(*) FROM user_groups WHERE group_id IN (${orgGroup}) AND deleted_at IS NULL GROUP BY group_id`,
      ],
      [
        'user_permissions_permission_id_idx',
        () =>
          sql`SELECT permission_id, count(*) FROM user_permissions WHERE permission_id IN (${permission}) AND deleted_at IS NULL GROUP BY permission_id`,
      ],
    ])('a count can use %s', async (index, query) => {
      expect(await plan(query())).toContain(index);
    });
  });
});
