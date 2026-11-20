/**
 * Pending-invitation lookup by email against a real PostgreSQL: exact, case-insensitive match
 * (no `ILIKE` wildcards), pending and unexpired only, any organization.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/organization-invitations-pending-by-email.postgres.integration.test.ts
 */
import { organizationInvitations, organizations, roles, schema, users } from '@grantjs/database';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OrganizationInvitationRepository } from '@/repositories/organization-invitations.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;

describe.skipIf(!url)('findPendingInvitationByEmail on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const repo = new OrganizationInvitationRepository(db);
  const tag = Date.now().toString(36);
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  let organizationId: string;
  let inviterId: string;
  let roleId: string;

  async function invite(
    email: string,
    overrides: Partial<typeof organizationInvitations.$inferInsert> = {}
  ) {
    await db.insert(organizationInvitations).values({
      organizationId,
      email,
      roleId,
      token: `pending-by-email-${tag}-${Math.random().toString(36).slice(2)}`,
      status: 'pending',
      expiresAt: future,
      invitedBy: inviterId,
      ...overrides,
    });
  }

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: `pending-by-email-${tag}`, slug: `pending-by-email-${tag}` })
      .returning({ id: organizations.id });
    organizationId = org.id;
    const [user] = await db.insert(users).values({ name: 'inviter' }).returning({ id: users.id });
    inviterId = user.id;
    const [role] = await db
      .insert(roles)
      .values({ name: `pending-by-email-role-${tag}` })
      .returning({ id: roles.id });
    roleId = role.id;

    await invite(`Mixed.Case-${tag}@test.grant.dev`);
    await invite(`expired-${tag}@test.grant.dev`, { expiresAt: past });
    await invite(`revoked-${tag}@test.grant.dev`, { status: 'revoked' });
    await invite(`accepted-${tag}@test.grant.dev`, { status: 'accepted' });
    await invite(`deleted-${tag}@test.grant.dev`, { deletedAt: new Date() });
  });

  afterAll(async () => {
    if (organizationId) {
      await db.delete(organizations).where(eq(organizations.id, organizationId));
    }
    if (inviterId) {
      await db.delete(users).where(eq(users.id, inviterId));
    }
    if (roleId) {
      await db.delete(roles).where(eq(roles.id, roleId));
    }
    await client.end();
  });

  it('matches case-insensitively and returns the organization', async () => {
    const found = await repo.findPendingInvitationByEmail(`mixed.case-${tag}@test.grant.dev`);

    expect(found?.organizationId).toBe(organizationId);
  });

  it.each(['expired', 'revoked', 'accepted', 'deleted'])(
    'ignores a %s invitation',
    async (kind) => {
      await expect(
        repo.findPendingInvitationByEmail(`${kind}-${tag}@test.grant.dev`)
      ).resolves.toBeNull();
    }
  );

  it('treats % and _ as literal characters, not patterns', async () => {
    await expect(repo.findPendingInvitationByEmail('%@test.grant.dev')).resolves.toBeNull();
    await expect(
      repo.findPendingInvitationByEmail(`mixed_case-${tag}@test.grant.dev`)
    ).resolves.toBeNull();
  });
});
