/**
 * `linkProjectUserIdentity` against a real PostgreSQL: what only the database can show.
 *
 * The link runs in one transaction under the restricted RLS role with the organization project
 * as tenant, as a scoped request does. A keyed CDM import creates the duplicate (no address,
 * this project's marker, a project role and a project password); an existing identity of the
 * organization holds the address. After the link:
 *
 * - the membership row (same id, marker included), the role and the project password belong to
 *   the identity; the duplicate is soft-deleted and its global marker is gone;
 * - exactly one event, `project.user_identity_linked`, with ids only;
 * - the next import with the duplicate's key, and one with the address, both resolve to the
 *   identity and create nobody; no deletion tombstone is written;
 * - a duplicate that is also a member of another project keeps that membership and stays live
 *   (the other project is invisible to the scoped request, so this is read on the base pool);
 * - every refusal writes nothing.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * and a login role that is a member of the RLS restricted role. It writes its own rows and
 * removes them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/project-user-identity-link.postgres.integration.test.ts
 */
import { GrantAuth } from '@grantjs/core';
import {
  cdmImportTombstones,
  eventLog,
  organizationProjects,
  organizations,
  organizationUsers,
  permissions,
  projectRoles,
  projects,
  projectUserCredentials,
  projectUsers,
  resources,
  roles,
  schema,
  userAuthenticationMethods,
  userRoles,
  users,
} from '@grantjs/database';
import {
  CdmFindBy,
  CdmModeStrategy,
  type Scope,
  type SyncProjectResult,
  Tenant,
} from '@grantjs/schema';
import { and, eq, gte, inArray, isNull, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import { BadRequestError, ConflictError } from '@/lib/errors';
import { scopeToRlsContext, setRlsContext } from '@/lib/rls';
import { createRepositories } from '@/repositories';
import { createServices } from '@/services';

const url = process.env.GRANT_TEST_DATABASE_URL;

type UserRow = CdmDocumentInput['users'][number];

describe.skipIf(!url)('linkProjectUserIdentity on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 10, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const tag = Date.now().toString(36);
  const cleanupUsers: string[] = [];
  const cleanupProjects: string[] = [];
  let organizationId: string;
  let orgRoleId: string;
  let actorId: string;
  let projectP: string;
  let projectQ: string;

  const emailOf = (label: string) => `link-${label}-${tag}@example.test`;
  const keyOf = (label: string) => `legacy-${label}-${tag}`;
  const roleKey = `editor-${tag}`;
  const scopeOf = (projectId: string): Scope => ({
    tenant: Tenant.OrganizationProject,
    id: `${organizationId}:${projectId}`,
  });

  async function createProject(label: string): Promise<string> {
    const [row] = await db
      .insert(projects)
      .values({ name: `link-${label}`, slug: `link-${label}-${tag}` })
      .returning({ id: projects.id });
    cleanupProjects.push(row.id);
    await db.insert(organizationProjects).values({ organizationId, projectId: row.id });
    return row.id;
  }

  /** The existing identity: an email method, a member of the organization. */
  async function createIdentity(
    label: string,
    options: { inOrganization?: boolean; memberOf?: string[] } = {}
  ): Promise<string> {
    const [row] = await db
      .insert(users)
      .values({ name: `link-${tag}-${label}` })
      .returning({ id: users.id });
    cleanupUsers.push(row.id);
    await db.insert(userAuthenticationMethods).values({
      userId: row.id,
      provider: 'email',
      providerId: emailOf(label),
      providerData: {},
      isVerified: true,
    });
    if (options.inOrganization ?? true) {
      await db
        .insert(organizationUsers)
        .values({ organizationId, userId: row.id, roleId: orgRoleId });
    }
    for (const projectId of options.memberOf ?? []) {
      await db.insert(projectUsers).values({ projectId, userId: row.id });
    }
    return row.id;
  }

  function document(userRows: UserRow[]): CdmDocumentInput {
    return {
      version: 1,
      id: null,
      mode: { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false },
      roles: [
        {
          key: roleKey,
          name: `Editor ${tag}`,
          permissions: [`perm-${tag}`],
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      users: userRows,
      resources: [
        {
          key: `res-${tag}`,
          slug: `link-documents-${tag}`,
          name: `Link documents ${tag}`,
          description: null,
          actions: ['read'],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      permissions: [
        {
          key: `perm-${tag}`,
          resource: `res-${tag}`,
          action: 'read',
          name: `Link documents:read ${tag}`,
          description: null,
          condition: null,
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      groups: [],
      tags: [],
    };
  }

  /** Run `fn` as a scoped request of the project: one transaction, restricted role. */
  async function asProject<T>(
    projectId: string,
    fn: (services: ReturnType<typeof createServices>, tx: typeof db) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (tx) => {
      await setRlsContext(tx as never, scopeToRlsContext(scopeOf(projectId)));
      const cache = new Proxy(
        {},
        { get: () => ({ delete: async () => undefined, keys: async () => [] }) }
      );
      const services = createServices(
        createRepositories(tx as never),
        { userId: actorId } as unknown as GrantAuth,
        tx as never,
        cache as never,
        {} as never,
        { baseDb: db }
      );
      return fn(services, tx as unknown as typeof db);
    });
  }

  const importInto = (projectId: string, rows: UserRow[]): Promise<SyncProjectResult> =>
    asProject(projectId, (services, tx) =>
      services.projectImport.importProjectCdm(
        { projectId, scope: scopeOf(projectId), input: document(rows) },
        tx as never
      )
    );

  const keyed = (label: string): UserRow => ({
    key: { value: keyOf(label), findBy: CdmFindBy.Key },
    name: `Person ${label} ${tag}`,
    roles: [roleKey],
  });

  const byEmail = (label: string): UserRow => ({
    key: { value: emailOf(label), findBy: CdmFindBy.Email },
    name: `Person ${label} ${tag}`,
    roles: [roleKey],
  });

  const link = (projectId: string, userId: string, email: string) =>
    asProject(projectId, (services, tx) =>
      services.projectUserIdentityLink.linkIdentity(
        { organizationId, projectId, userId, email },
        tx as never
      )
    );

  /** The live member of `projectId` an import resolved `label`'s key to. */
  async function importedDuplicate(projectId: string, label: string): Promise<string> {
    const [row] = await db
      .select({ userId: projectUsers.userId })
      .from(projectUsers)
      .innerJoin(users, eq(users.id, projectUsers.userId))
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          isNull(projectUsers.deletedAt),
          sql`${projectUsers.metadata} -> 'cdmImport' ->> 'externalKey' = ${keyOf(label)}`
        )
      );
    expect(row, `no member keyed ${label}`).toBeDefined();
    cleanupUsers.push(row.userId);
    return row.userId;
  }

  const liveMembers = (projectId: string) =>
    db
      .select({ id: projectUsers.id, userId: projectUsers.userId, metadata: projectUsers.metadata })
      .from(projectUsers)
      .where(and(eq(projectUsers.projectId, projectId), isNull(projectUsers.deletedAt)));

  const projectRoleIds = (projectId: string) =>
    db
      .select({ roleId: projectRoles.roleId })
      .from(projectRoles)
      .where(and(eq(projectRoles.projectId, projectId), isNull(projectRoles.deletedAt)));

  async function liveRoleHolders(projectId: string): Promise<string[]> {
    const ids = (await projectRoleIds(projectId)).map((r) => r.roleId);
    if (ids.length === 0) return [];
    const rows = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(and(inArray(userRoles.roleId, ids), isNull(userRoles.deletedAt)));
    return rows.map((r) => r.userId);
  }

  const now = async (): Promise<Date> => {
    const [row] = await db.execute<{ now: Date }>(sql`SELECT now() AS now`);
    return new Date(row.now);
  };

  const eventsSince = (since: Date, projectId: string) =>
    db
      .select({ type: eventLog.type, payload: eventLog.payload, subject: eventLog.subjectUserId })
      .from(eventLog)
      .where(
        and(gte(eventLog.createdAt, since), eq(eventLog.scopeId, `${organizationId}:${projectId}`))
      );

  beforeAll(async () => {
    const [actor] = await db
      .insert(users)
      .values({ name: `link-${tag}-actor` })
      .returning({ id: users.id });
    actorId = actor.id;
    cleanupUsers.push(actor.id);
    const [org] = await db
      .insert(organizations)
      .values({ name: `link-org-${tag}`, slug: `link-org-${tag}` })
      .returning({ id: organizations.id });
    organizationId = org.id;
    const [role] = await db
      .insert(roles)
      .values({ name: `link-org-role-${tag}` })
      .returning({ id: roles.id });
    orgRoleId = role.id;
    projectP = await createProject('p');
    projectQ = await createProject('q');
  });

  afterAll(async () => {
    await db.delete(eventLog).where(like(eventLog.scopeId, `${organizationId}:%`));
    await db.delete(projectUsers).where(inArray(projectUsers.projectId, cleanupProjects));
    await db
      .delete(projectUserCredentials)
      .where(inArray(projectUserCredentials.projectId, cleanupProjects));
    await db.delete(organizationUsers).where(eq(organizationUsers.organizationId, organizationId));
    await db
      .delete(userAuthenticationMethods)
      .where(like(userAuthenticationMethods.providerId, `link-%-${tag}@example.test`));
    await db.delete(users).where(like(users.name, `Person % ${tag}`));
    await db.delete(users).where(inArray(users.id, cleanupUsers));
    await db.delete(roles).where(like(roles.name, `%${tag}`));
    await db.delete(permissions).where(like(permissions.name, `%${tag}`));
    await db.delete(resources).where(like(resources.name, `%${tag}`));
    await db
      .delete(organizationProjects)
      .where(eq(organizationProjects.organizationId, organizationId));
    await db.delete(projects).where(inArray(projects.id, cleanupProjects));
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await client.end();
  });

  it('moves the membership, role and project password to the identity, and retires the duplicate', async () => {
    const created = await importInto(projectP, [keyed('ada')]);
    expect(created.usersCreated).toBe(1);
    const duplicate = await importedDuplicate(projectP, 'ada');
    await db.insert(projectUserCredentials).values({
      projectId: projectP,
      userId: duplicate,
      hash: '$2b$04$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
      source: 'migrated-import',
    });
    const identity = await createIdentity('ada');
    const [membershipBefore] = (await liveMembers(projectP)).filter((m) => m.userId === duplicate);
    const since = await now();

    const result = await link(projectP, duplicate, `  ${emailOf('ada').toUpperCase()} `);

    expect(result).toMatchObject({
      linked: true,
      fromUserId: duplicate,
      toUserId: identity,
      fromRetired: true,
      projectUserId: membershipBefore.id,
    });
    expect(result.counts).toMatchObject({
      projectUsers: 1,
      userRoles: 1,
      projectUserCredentials: 1,
    });

    const members = await liveMembers(projectP);
    const moved = members.find((m) => m.id === membershipBefore.id);
    expect(moved?.userId).toBe(identity);
    expect(
      (moved?.metadata as { cdmImport?: { externalKey?: string } }).cdmImport?.externalKey
    ).toBe(keyOf('ada'));
    expect(members.some((m) => m.userId === duplicate)).toBe(false);
    expect(await liveRoleHolders(projectP)).toContain(identity);
    expect(await liveRoleHolders(projectP)).not.toContain(duplicate);

    const [credential] = await db
      .select({ userId: projectUserCredentials.userId })
      .from(projectUserCredentials)
      .where(
        and(
          eq(projectUserCredentials.projectId, projectP),
          isNull(projectUserCredentials.deletedAt)
        )
      );
    expect(credential.userId).toBe(identity);

    const [retired] = await db
      .select({ deletedAt: users.deletedAt, metadata: users.metadata })
      .from(users)
      .where(eq(users.id, duplicate));
    expect(retired.deletedAt).not.toBeNull();
    expect((retired.metadata as Record<string, unknown>).cdmImport).toBeUndefined();

    const events = await eventsSince(since, projectP);
    expect(events.map((e) => e.type)).toEqual(['project.user_identity_linked']);
    expect(events[0].subject).toBe(identity);
    const payload = JSON.stringify(events[0].payload);
    expect(payload).toContain(duplicate);
    expect(payload).not.toContain(emailOf('ada'));
    expect(payload).not.toContain(keyOf('ada'));
  });

  it('lets the next import resolve the key and the address to the identity, creating nobody', async () => {
    const identity = (
      await db
        .select({ userId: userAuthenticationMethods.userId })
        .from(userAuthenticationMethods)
        .where(eq(userAuthenticationMethods.providerId, emailOf('ada')))
    )[0].userId;

    const byKey = await importInto(projectP, [keyed('ada')]);
    expect(byKey.usersCreated).toBe(0);
    let members = await liveMembers(projectP);
    expect(members.filter((m) => m.userId === identity)).toHaveLength(1);
    expect(members).toHaveLength(1);

    const byAddress = await importInto(projectP, [byEmail('ada')]);
    expect(byAddress.usersCreated).toBe(0);
    members = await liveMembers(projectP);
    expect(members.map((m) => m.userId)).toEqual([identity]);

    const tombstones = await db
      .select()
      .from(cdmImportTombstones)
      .where(eq(cdmImportTombstones.projectId, projectP));
    expect(tombstones).toHaveLength(0);
  });

  it('keeps a duplicate that is a member of another project live, and moves only this project', async () => {
    await importInto(projectP, [keyed('bo')]);
    const duplicate = await importedDuplicate(projectP, 'bo');
    await db.insert(projectUsers).values({ projectId: projectQ, userId: duplicate });
    const identity = await createIdentity('bo');

    const result = await link(projectP, duplicate, emailOf('bo'));

    expect(result.fromRetired).toBe(false);
    const [user] = await db
      .select({ deletedAt: users.deletedAt, metadata: users.metadata })
      .from(users)
      .where(eq(users.id, duplicate));
    expect(user.deletedAt).toBeNull();
    expect((user.metadata as Record<string, unknown>).cdmImport).toBeUndefined();
    expect((await liveMembers(projectQ)).map((m) => m.userId)).toContain(duplicate);
    expect((await liveMembers(projectP)).map((m) => m.userId)).toContain(identity);
  });

  describe('refusals write nothing', () => {
    async function assertUntouched(
      projectId: string,
      duplicate: string,
      run: () => Promise<unknown>,
      error: new (...args: never[]) => Error
    ): Promise<void> {
      const before = await liveMembers(projectId);
      const since = await now();
      await expect(run()).rejects.toBeInstanceOf(error);
      const after = await liveMembers(projectId);
      expect(after).toEqual(before);
      expect(after.some((m) => m.userId === duplicate)).toBe(true);
      expect(await eventsSince(since, projectId)).toHaveLength(0);
    }

    it('an identity outside the organization: the set-email conflict', async () => {
      await importInto(projectP, [keyed('cy')]);
      const duplicate = await importedDuplicate(projectP, 'cy');
      await createIdentity('cy', { inOrganization: false });
      await assertUntouched(
        projectP,
        duplicate,
        () => link(projectP, duplicate, emailOf('cy')),
        ConflictError
      );
    });

    it('an identity that is already a member of the project', async () => {
      await importInto(projectP, [keyed('di')]);
      const duplicate = await importedDuplicate(projectP, 'di');
      await createIdentity('di', { memberOf: [projectP] });
      await assertUntouched(
        projectP,
        duplicate,
        () => link(projectP, duplicate, emailOf('di')),
        ConflictError
      );
    });

    it('a member that can sign in', async () => {
      await importInto(projectP, [keyed('ed')]);
      const duplicate = await importedDuplicate(projectP, 'ed');
      await db.insert(userAuthenticationMethods).values({
        userId: duplicate,
        provider: 'email',
        providerId: emailOf('ed-own'),
        providerData: {},
        isVerified: false,
      });
      await createIdentity('ed');
      await assertUntouched(
        projectP,
        duplicate,
        () => link(projectP, duplicate, emailOf('ed')),
        BadRequestError
      );
    });

    it('an address nobody holds', async () => {
      await importInto(projectP, [keyed('fa')]);
      const duplicate = await importedDuplicate(projectP, 'fa');
      await assertUntouched(
        projectP,
        duplicate,
        () => link(projectP, duplicate, emailOf('nobody')),
        BadRequestError
      );
    });
  });
});
