/**
 * Organization members list against a real PostgreSQL: the member ∪ invitation
 * union must ORDER BY uniquely aliased output columns. Bare `users.name` /
 * `roles.name` made Postgres reject ORDER BY "name" as ambiguous (42702).
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every
 * migration applied. Without the variable the file is skipped, so `pnpm test`
 * stays database-free.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/organization-members.postgres.integration.test.ts
 */
import {
  organizationInvitations,
  organizations,
  organizationUsers,
  roles,
  schema,
  userAuthenticationMethods,
  users,
} from '@grantjs/database';
import { MemberType, OrganizationMemberSortableField, SortOrder, Tenant } from '@grantjs/schema';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OrganizationMemberRepository } from '@/repositories/organization-members.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;

const SORT_FIELDS = [
  OrganizationMemberSortableField.Name,
  OrganizationMemberSortableField.Email,
  OrganizationMemberSortableField.Role,
  OrganizationMemberSortableField.CreatedAt,
] as const;

const SORT_ORDERS = [SortOrder.Asc, SortOrder.Desc] as const;

describe.skipIf(!url)('organizationMembers union page on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 10, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const repo = new OrganizationMemberRepository(db);
  const tag = Date.now().toString(36);

  const memberCreatedAt = new Date('2026-01-01T00:00:00.000Z');
  const invitationCreatedAt = new Date('2026-06-01T00:00:00.000Z');
  const memberName = 'zzz-member';
  const memberEmail = `zzz-member-${tag}@test.grant.dev`;
  const invitationEmail = `aaa-invite-${tag}@test.grant.dev`;
  const memberRoleName = `Zebra Role ${tag}`;
  const invitationRoleName = `Alpha Role ${tag}`;

  let organizationId: string;
  let memberUserId: string;
  let memberRoleId: string;
  let invitationRoleId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: `members-union-${tag}`, slug: `members-union-${tag}` })
      .returning({ id: organizations.id });
    organizationId = org.id;

    const [memberUser] = await db
      .insert(users)
      .values({ name: memberName, createdAt: memberCreatedAt })
      .returning({ id: users.id });
    memberUserId = memberUser.id;

    await db.insert(userAuthenticationMethods).values({
      userId: memberUserId,
      provider: 'email',
      providerId: memberEmail,
      isPrimary: true,
      isVerified: true,
    });

    const insertedRoles = await db
      .insert(roles)
      .values([{ name: memberRoleName }, { name: invitationRoleName }])
      .returning({ id: roles.id, name: roles.name });
    memberRoleId = insertedRoles.find((role) => role.name === memberRoleName)!.id;
    invitationRoleId = insertedRoles.find((role) => role.name === invitationRoleName)!.id;

    await db.insert(organizationUsers).values({
      organizationId,
      userId: memberUserId,
      roleId: memberRoleId,
    });

    await db.insert(organizationInvitations).values({
      organizationId,
      email: invitationEmail,
      roleId: invitationRoleId,
      token: `members-union-${tag}`,
      status: 'pending',
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      invitedBy: memberUserId,
      createdAt: invitationCreatedAt,
    });
  });

  afterAll(async () => {
    if (organizationId) {
      await db.delete(organizations).where(eq(organizations.id, organizationId));
    }
    if (memberUserId) {
      await db.delete(users).where(eq(users.id, memberUserId));
    }
    const roleIds = [memberRoleId, invitationRoleId].filter(Boolean);
    if (roleIds.length > 0) {
      await db.delete(roles).where(inArray(roles.id, roleIds));
    }
    await client.end();
  });

  it.each(SORT_FIELDS.flatMap((field) => SORT_ORDERS.map((order) => ({ field, order }))))(
    'lists a member and a pending invitation sorted by $field $order',
    async ({ field, order }) => {
      const result = await repo.getOrganizationMembers({
        scope: { id: organizationId, tenant: Tenant.Organization },
        page: 1,
        limit: 20,
        sort: { field, order },
      });

      expect(result.totalCount).toBe(2);
      expect(result.members).toHaveLength(2);
      expect(result.members.some((row) => row.type === MemberType.Member)).toBe(true);
      expect(result.members.some((row) => row.type === MemberType.Invitation)).toBe(true);

      const member = result.members.find((row) => row.type === MemberType.Member)!;
      const invitation = result.members.find((row) => row.type === MemberType.Invitation)!;
      const memberIndex = result.members.indexOf(member);
      const invitationIndex = result.members.indexOf(invitation);

      expect(member.name).toBe(memberName);
      expect(member.email).toBe(memberEmail);
      expect(member.role.name).toBe(memberRoleName);
      expect(invitation.name).toBe(invitationEmail);
      expect(invitation.email).toBe(invitationEmail);
      expect(invitation.role.name).toBe(invitationRoleName);
      expect(invitation.status).toBe('pending');

      const firstIsMember = (() => {
        switch (field) {
          case OrganizationMemberSortableField.Name:
          case OrganizationMemberSortableField.Email:
          case OrganizationMemberSortableField.Role:
            return order === SortOrder.Desc;
          case OrganizationMemberSortableField.CreatedAt:
            return order === SortOrder.Asc;
          default:
            return order === SortOrder.Desc;
        }
      })();

      if (firstIsMember) {
        expect(memberIndex).toBeLessThan(invitationIndex);
      } else {
        expect(invitationIndex).toBeLessThan(memberIndex);
      }
    }
  );
});
