/**
 * The relationship counts the role, group and user lists show, against a real PostgreSQL: a
 * role's users and a group's roles in an organization, a project and an account scope, that
 * soft-deleted rows do not count, that the role's users agree with what the users list counts
 * for a user, and that the new partial indexes serve the counts.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (`pnpm --filter @grantjs/database db:migrate`). It writes its own rows and removes them.
 * Without the variable the whole file is skipped, so `pnpm test` stays database-free.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/relation-counts.roles-users.postgres.integration.test.ts
 */
import {
  groups,
  organizationRoles,
  organizations,
  organizationUsers,
  projectRoles,
  projects,
  projectUsers,
  roleGroups,
  roles,
  schema,
  userGroups,
  userRoles,
  users,
} from '@grantjs/database';
import { type Scope, Tenant } from '@grantjs/schema';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RoleGroupRepository } from '@/repositories/role-groups.repository';
import { UserGroupRepository } from '@/repositories/user-groups.repository';
import { UserRoleRepository } from '@/repositories/user-roles.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;

describe.skipIf(!url)('role, group and user relationship counts on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 2, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const userRoleRepository = new UserRoleRepository(db);
  const roleGroupRepository = new RoleGroupRepository(db);
  const userGroupRepository = new UserGroupRepository(db);

  const tag = Date.now().toString(36);
  let orgUser1: string;
  let orgUser2: string;
  let outsider: string;
  let leaver: string;
  let projectOnly: string;
  let organizationId: string;
  let projectA: string;
  let projectB: string;
  let orgRole: string;
  let orgRoleRemovedFromGroup: string;
  let projectRole: string;
  let otherRole: string;
  let group: string;
  let organizationScope: Scope;
  let projectAScope: Scope;
  let projectBScope: Scope;
  let accountScope: Scope;

  beforeAll(async () => {
    [orgUser1, orgUser2, outsider, leaver, projectOnly] = (
      await db
        .insert(users)
        .values(
          ['one', 'two', 'outsider', 'leaver', 'project-only'].map((n) => ({
            name: `rcounts-${n}-${tag}`,
          }))
        )
        .returning({ id: users.id })
    ).map((row) => row.id);
    [{ id: organizationId }] = await db
      .insert(organizations)
      .values({ name: `rcounts-${tag}`, slug: `rcounts-${tag}` })
      .returning({ id: organizations.id });
    [projectA, projectB] = (
      await db
        .insert(projects)
        .values([
          { name: 'rcounts-a', slug: `rcounts-a-${tag}` },
          { name: 'rcounts-b', slug: `rcounts-b-${tag}` },
        ])
        .returning({ id: projects.id })
    ).map((row) => row.id);
    [orgRole, orgRoleRemovedFromGroup, projectRole, otherRole] = (
      await db
        .insert(roles)
        .values(
          ['org', 'org-removed', 'project', 'other'].map((n) => ({ name: `rcounts-${n}-${tag}` }))
        )
        .returning({ id: roles.id })
    ).map((row) => row.id);
    [{ id: group }] = await db
      .insert(groups)
      .values({ name: `rcounts-${tag}` })
      .returning({ id: groups.id });

    organizationScope = { tenant: Tenant.Organization, id: organizationId };
    projectAScope = { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectA}` };
    projectBScope = { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectB}` };
    accountScope = { tenant: Tenant.Account, id: organizationId };

    await db
      .insert(organizationUsers)
      .values([orgUser1, orgUser2].map((userId) => ({ organizationId, userId, roleId: orgRole })));
    await db.insert(projectUsers).values([
      { projectId: projectA, userId: orgUser1 },
      { projectId: projectA, userId: projectOnly },
      { projectId: projectB, userId: orgUser2 },
    ]);
    await db.insert(organizationRoles).values([
      { organizationId, roleId: orgRole },
      { organizationId, roleId: orgRoleRemovedFromGroup },
    ]);
    await db.insert(projectRoles).values({ projectId: projectA, roleId: projectRole });

    // The organization role is held by its two users, by a user of no organization and, with a
    // removed assignment, by a former holder. The project role by one organization user who is
    // also a project A user, by a user of project A only and by a user of neither.
    await db.insert(userRoles).values([
      { userId: orgUser1, roleId: orgRole },
      { userId: orgUser2, roleId: orgRole },
      { userId: outsider, roleId: orgRole },
      { userId: leaver, roleId: orgRole, deletedAt: new Date() },
      { userId: orgUser1, roleId: projectRole },
      { userId: projectOnly, roleId: projectRole },
      { userId: outsider, roleId: projectRole },
    ]);

    // The group is in the organization role, in the project role, in a role of neither scope
    // and, with a removed row, in a second organization role.
    await db.insert(roleGroups).values([
      { roleId: orgRole, groupId: group },
      { roleId: projectRole, groupId: group },
      { roleId: otherRole, groupId: group },
      { roleId: orgRoleRemovedFromGroup, groupId: group, deletedAt: new Date() },
    ]);

    // Direct groups of a user, one removed.
    await db.insert(userGroups).values([
      { userId: orgUser1, groupId: group },
      { userId: orgUser2, groupId: group, deletedAt: new Date() },
    ]);
  });

  afterAll(async () => {
    await db.delete(groups).where(inArray(groups.id, [group]));
    await db
      .delete(roles)
      .where(inArray(roles.id, [orgRole, orgRoleRemovedFromGroup, projectRole, otherRole]));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db.delete(organizations).where(inArray(organizations.id, [organizationId]));
    await db
      .delete(users)
      .where(inArray(users.id, [orgUser1, orgUser2, outsider, leaver, projectOnly]));
    await client.end();
  });

  describe('a role’s users', () => {
    it('in an organization: its live holders who are the organization’s users', async () => {
      const counts = await userRoleRepository.countUsersByRoleIds(
        [orgRole, projectRole],
        organizationScope
      );
      expect(counts.get(orgRole)).toBe(2);
      expect(counts.get(projectRole)).toBe(1);
      expect(
        (
          await userRoleRepository.getUserIdsByRoleId({
            roleId: orgRole,
            scope: organizationScope,
          })
        ).sort()
      ).toEqual([orgUser1, orgUser2].sort());
    });

    it('in a project: its live holders who are that project’s users, with no project table', async () => {
      const counts = await userRoleRepository.countUsersByRoleIds(
        [projectRole, orgRole],
        projectAScope
      );
      expect(counts.get(projectRole)).toBe(2);
      // orgRole's holders are project users of A only through orgUser1.
      expect(counts.get(orgRole)).toBe(1);
      expect(
        (
          await userRoleRepository.getUserIdsByRoleId({
            roleId: projectRole,
            scope: projectAScope,
          })
        ).sort()
      ).toEqual([orgUser1, projectOnly].sort());
    });

    it('in another project: only that project’s users', async () => {
      const counts = await userRoleRepository.countUsersByRoleIds(
        [projectRole, orgRole],
        projectBScope
      );
      expect(counts.has(projectRole)).toBe(false);
      expect(counts.get(orgRole)).toBe(1);
    });

    it('in an account scope: none', async () => {
      const counts = await userRoleRepository.countUsersByRoleIds([orgRole], accountScope);
      expect(counts.size).toBe(0);
      await expect(
        userRoleRepository.getUserIdsByRoleId({ roleId: orgRole, scope: accountScope })
      ).resolves.toEqual([]);
    });

    it('counts nothing for no ids', async () => {
      expect((await userRoleRepository.countUsersByRoleIds([], organizationScope)).size).toBe(0);
    });

    it('agrees with the roles the users list counts for each user of a project', async () => {
      // The users list counts, for a project, a user's live global role rows whose role is one
      // of the project's (UserHandler.countUserRolesByScope). Pairwise, a role lists a user
      // exactly when the user's count includes that role.
      const projectUserIds = [orgUser1, projectOnly];
      const userRolesOfUsers = await userRoleRepository.getUserRolesByUserIds(projectUserIds);
      const scopedRoleIds = new Set([projectRole]);
      const listedForUser = new Set(
        userRolesOfUsers
          .filter((row) => scopedRoleIds.has(row.roleId))
          .map((row) => `${row.userId}:${row.roleId}`)
      );
      const listedForRole = new Set(
        (
          await userRoleRepository.getUserIdsByRoleId({
            roleId: projectRole,
            scope: projectAScope,
          })
        ).map((userId) => `${userId}:${projectRole}`)
      );
      expect(listedForRole).toEqual(listedForUser);
    });
  });

  describe('a group’s roles', () => {
    it('in an organization: the organization’s roles that live include it', async () => {
      const counts = await roleGroupRepository.countRolesByGroupIds([group], organizationScope);
      expect(counts.get(group)).toBe(1);
    });

    it('in a project: the project’s roles that include it', async () => {
      const counts = await roleGroupRepository.countRolesByGroupIds([group], projectAScope);
      expect(counts.get(group)).toBe(1);
      expect((await roleGroupRepository.countRolesByGroupIds([group], projectBScope)).size).toBe(0);
    });

    it('in an account scope: none', async () => {
      expect((await roleGroupRepository.countRolesByGroupIds([group], accountScope)).size).toBe(0);
    });
  });

  describe('a user’s groups', () => {
    it('counts the live direct groups by user ids', async () => {
      const counts = await userGroupRepository.countUserGroupsByUserIds([orgUser1, orgUser2]);
      expect(counts.get(orgUser1)).toBe(1);
      expect(counts.has(orgUser2)).toBe(false);
      expect(
        (await userGroupRepository.getUserGroupsByUserIds([orgUser1, orgUser2])).map(
          (row) => row.userId
        )
      ).toEqual([orgUser1]);
    });
  });

  describe('indexes', () => {
    // Many roles, assignments and memberships of other groups and roles, so the plan shows which
    // index reaches one role's or group's rows without walking the table.
    const BULK = 3000;
    let bulkUsers: string[] = [];
    let bulkRoles: string[] = [];
    let bulkGroup: string;
    let bulkRole: string;

    beforeAll(async () => {
      bulkUsers = (
        await db
          .insert(users)
          .values(Array.from({ length: BULK }, (_, i) => ({ name: `rcounts-bulk-${i}-${tag}` })))
          .returning({ id: users.id })
      ).map((row) => row.id);
      bulkRoles = (
        await db
          .insert(roles)
          .values(Array.from({ length: BULK }, (_, i) => ({ name: `rcounts-bulk-${i}-${tag}` })))
          .returning({ id: roles.id })
      ).map((row) => row.id);
      bulkRole = bulkRoles[0];
      [{ id: bulkGroup }] = await db
        .insert(groups)
        .values({ name: `rcounts-bulk-${tag}` })
        .returning({ id: groups.id });
      await db.insert(userRoles).values(bulkUsers.map((userId) => ({ userId, roleId: bulkRole })));
      await db
        .insert(roleGroups)
        .values(bulkRoles.map((roleId) => ({ roleId, groupId: bulkGroup })));
      await db
        .insert(userGroups)
        .values(bulkUsers.map((userId) => ({ userId, groupId: bulkGroup })));
      await db.execute(sql`ANALYZE user_roles, role_groups, user_groups`);
    }, 60_000);

    afterAll(async () => {
      await db.delete(groups).where(inArray(groups.id, [bulkGroup]));
      await db.delete(roles).where(inArray(roles.id, bulkRoles));
      await db.delete(users).where(inArray(users.id, bulkUsers));
    }, 60_000);

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
        'user_roles_role_id_idx',
        () =>
          sql`SELECT role_id, count(*) FROM user_roles WHERE role_id IN (${orgRole}) AND deleted_at IS NULL GROUP BY role_id`,
      ],
      [
        'role_groups_group_id_idx',
        () =>
          sql`SELECT group_id, count(*) FROM role_groups WHERE group_id IN (${group}) AND deleted_at IS NULL GROUP BY group_id`,
      ],
      [
        // Existing index: the groups of a user need no new one.
        'user_groups_user_id_group_id_unique',
        () =>
          sql`SELECT user_id, count(*) FROM user_groups WHERE user_id IN (${orgUser1}) AND deleted_at IS NULL GROUP BY user_id`,
      ],
    ])('a count can use %s', async (index, query) => {
      expect(await plan(query())).toContain(index);
    });
  });
});
