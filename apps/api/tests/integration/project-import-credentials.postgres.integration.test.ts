/**
 * CDM import of passwords against a real PostgreSQL (ADR 0011 slice 3): what only the
 * database can show.
 *
 * The real `ProjectImportService` runs in a transaction under the restricted RLS role with
 * the importing project as tenant, exactly as the sync job runs it (`setRlsContext`). That
 * role has no privileges on the platform credential tables (migration 0088), so an import
 * that touched them would fail here, and `project_users` shows it only its own project's rows.
 *
 * - the credential is written for a member this document assigns and for an existing member,
 *   and nobody gets one for a non-member: that refusal rolls the whole import back, users and
 *   memberships included;
 * - provenance (replace, unchanged, owned) against the real unique index and upsert;
 * - project A's import neither reads nor changes project B's credential of the same person
 *   (the restrictive select policy hides it; the import only ever names its own project);
 * - one membership query and one credential query for a document of many rows.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (`pnpm --filter @grantjs/database db:migrate`) and a login role that is a member of the RLS
 * restricted role. Without the variable the whole file is skipped, so `pnpm test` stays
 * database-free. It writes its own rows and removes them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/project-import-credentials.postgres.integration.test.ts
 */
import { GrantAuth } from '@grantjs/core';
import {
  permissions,
  projects,
  projectUserCredentials,
  projectUsers,
  resources,
  roles,
  schema,
  userAuthenticationMethods,
  userCredentials,
  users,
} from '@grantjs/database';
import {
  CdmFindBy,
  CdmModeStrategy,
  CdmPasswordAlgorithm,
  type Scope,
  type SyncProjectResult,
  Tenant,
} from '@grantjs/schema';
import { genSaltSync, hashSync } from 'bcrypt';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import { ValidationError } from '@/lib/errors';
import { scopeToRlsContext, setRlsContext } from '@/lib/rls';
import { createRepositories } from '@/repositories';
import { createServices } from '@/services';

const url = process.env.GRANT_TEST_DATABASE_URL;

const hashOf = (password: string) => hashSync(password, genSaltSync(4, 'a'));
const HASH_1 = hashOf('Imported-Passw0rd-1');
const HASH_2 = hashOf('Imported-Passw0rd-2');
const HASH_3 = hashOf('Imported-Passw0rd-3');

type UserRow = CdmDocumentInput['users'][number];

describe.skipIf(!url)('CDM password import on PostgreSQL', () => {
  const queries: string[] = [];
  const client = postgres(url ?? 'postgres://unused', { max: 10, onnotice: () => {} });
  const db = drizzle(client, {
    schema,
    logger: { logQuery: (query: string) => void queries.push(query) },
  });
  const tag = Date.now().toString(36);
  const accountId = crypto.randomUUID();
  const cleanupUsers: string[] = [];
  const cleanupProjects: string[] = [];
  let projectA: string;
  let projectB: string;

  const emailOf = (label: string) => `import-${label}-${tag}@example.test`;
  const scopeOf = (projectId: string): Scope => ({
    tenant: Tenant.AccountProject,
    id: `${accountId}:${projectId}`,
  });

  async function createProject(label: string): Promise<string> {
    const [row] = await db
      .insert(projects)
      .values({ name: `import-cred-${label}`, slug: `import-cred-${label}-${tag}` })
      .returning({ id: projects.id });
    cleanupProjects.push(row.id);
    return row.id;
  }

  /** A person with an email identity, optionally already a member of a project. */
  async function createPerson(
    label: string,
    options: { memberOf?: string[]; verified?: boolean } = {}
  ): Promise<string> {
    const [row] = await db
      .insert(users)
      .values({ name: `import-${tag}-${label}` })
      .returning({ id: users.id });
    cleanupUsers.push(row.id);
    await db.insert(userAuthenticationMethods).values({
      userId: row.id,
      provider: 'email',
      providerId: emailOf(label),
      providerData: {},
      isVerified: options.verified ?? false,
    });
    for (const projectId of options.memberOf ?? []) {
      await db.insert(projectUsers).values({ projectId, userId: row.id });
    }
    return row.id;
  }

  async function credentialsOf(projectId: string) {
    return db
      .select({
        userId: projectUserCredentials.userId,
        hash: projectUserCredentials.hash,
        source: projectUserCredentials.source,
        updatedAt: projectUserCredentials.updatedAt,
        deletedAt: projectUserCredentials.deletedAt,
      })
      .from(projectUserCredentials)
      .where(eq(projectUserCredentials.projectId, projectId));
  }

  const keyed = (rows: Awaited<ReturnType<typeof credentialsOf>>) =>
    new Map(rows.map((r) => [r.userId, r]));

  /** One import as the sync job runs it: one transaction, restricted role, project tenant. */
  async function importInto(
    projectId: string,
    userRows: UserRow[],
    options: { withRole?: boolean; inspect?: (tx: typeof db) => Promise<void> } = {}
  ): Promise<SyncProjectResult> {
    const scope = scopeOf(projectId);
    const withRole = options.withRole ?? false;
    const input: CdmDocumentInput = {
      version: 1,
      id: null,
      mode: { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false },
      roles: withRole
        ? [
            {
              key: `viewer-${tag}`,
              name: `Viewer ${tag}`,
              permissions: [`perm-${tag}`],
              groups: [],
              tags: [],
              primaryTag: null,
              metadata: null,
            },
          ]
        : [],
      users: userRows,
      resources: withRole
        ? [
            {
              key: `res-${tag}`,
              slug: `documents-${tag}`,
              name: `Documents ${tag}`,
              description: null,
              actions: ['read'],
              tags: [],
              primaryTag: null,
              metadata: null,
            },
          ]
        : [],
      permissions: withRole
        ? [
            {
              key: `perm-${tag}`,
              resource: `res-${tag}`,
              action: 'read',
              name: `Documents:read ${tag}`,
              description: null,
              condition: null,
              groups: [],
              tags: [],
              primaryTag: null,
              metadata: null,
            },
          ]
        : [],
      groups: [],
      tags: [],
    };

    return db.transaction(async (tx) => {
      await setRlsContext(tx as never, scopeToRlsContext(scope));
      const cache = new Proxy(
        {},
        { get: () => ({ delete: async () => undefined, keys: async () => [] }) }
      );
      const services = createServices(
        createRepositories(tx as never),
        { userId: cleanupUsers[0] } as unknown as GrantAuth,
        tx as never,
        cache as never,
        {} as never,
        { baseDb: db }
      );
      const result = await services.projectImport.importProjectCdm(
        { projectId, scope, input },
        tx as never
      );
      await options.inspect?.(tx as unknown as typeof db);
      return result;
    });
  }

  const withPassword = (label: string, hash: string, roles?: string[]): UserRow => ({
    key: { value: emailOf(label), findBy: CdmFindBy.Email },
    name: `Person ${label} ${tag}`,
    ...(roles ? { roles } : {}),
    password: { algorithm: CdmPasswordAlgorithm.Bcrypt, hash },
  });

  beforeAll(async () => {
    projectA = await createProject('a');
    projectB = await createProject('b');
    // Someone to attribute audit rows to.
    const [row] = await db
      .insert(users)
      .values({ name: `import-${tag}-actor` })
      .returning({ id: users.id });
    cleanupUsers.unshift(row.id);
  });

  afterAll(async () => {
    await db
      .delete(projectUserCredentials)
      .where(inArray(projectUserCredentials.projectId, cleanupProjects));
    await db.delete(projectUsers).where(inArray(projectUsers.projectId, cleanupProjects));
    await db
      .delete(userAuthenticationMethods)
      .where(like(userAuthenticationMethods.providerId, `import-%-${tag}@example.test`));
    await db.delete(userCredentials).where(inArray(userCredentials.userId, cleanupUsers));
    await db.delete(roles).where(like(roles.name, `%${tag}`));
    await db.delete(permissions).where(like(permissions.name, `%${tag}`));
    await db.delete(resources).where(like(resources.name, `%${tag}`));
    // Users the import created are named after the document row and the run's tag.
    await db.delete(users).where(like(users.name, `Person % ${tag}`));
    await db.delete(users).where(inArray(users.id, cleanupUsers));
    await db.delete(projects).where(inArray(projects.id, cleanupProjects));
    await client.end();
  });

  it('runs as the restricted role with the project as tenant, and never needs a platform table', async () => {
    const member = await createPerson('role-check', { memberOf: [projectA] });
    let seen: Record<string, unknown> | undefined;

    const result = await importInto(projectA, [withPassword('role-check', HASH_1)], {
      inspect: async (tx) => {
        [seen] = await tx.execute(
          sql`SELECT current_user AS who, current_setting('app.current_project_id', true) AS project`
        );
      },
    });

    expect(seen).toEqual({ who: 'grant_app_restricted', project: projectA });
    expect(result.passwordsImported).toBe(1);
    // The platform credential table is out of reach of that role, and the import left it alone.
    expect(
      await db.select().from(userCredentials).where(eq(userCredentials.userId, member))
    ).toEqual([]);
  });

  it('writes the credential for a member the document assigns and for an existing member', async () => {
    const existing = await createPerson('existing', { memberOf: [projectA] });
    const verified = await createPerson('verified', { verified: true });

    const result = await importInto(
      projectA,
      [
        // Assigned by this document: becomes a member, then gets the credential.
        withPassword('assigned', HASH_1, [`viewer-${tag}`]),
        // Password-only for someone already a member.
        withPassword('existing', HASH_2),
        // A verified identity is not excluded.
        withPassword('verified', HASH_3, [`viewer-${tag}`]),
      ],
      { withRole: true }
    );

    expect(result).toMatchObject({
      passwordsImported: 3,
      passwordsUpdated: 0,
      passwordsUnchanged: 0,
      passwordsSkippedExisting: 0,
      usersCreated: 1,
    });
    const [assigned] = await db
      .select({ userId: userAuthenticationMethods.userId })
      .from(userAuthenticationMethods)
      .where(eq(userAuthenticationMethods.providerId, emailOf('assigned')));
    cleanupUsers.push(assigned.userId);
    const rows = keyed(await credentialsOf(projectA));
    expect(rows.get(assigned.userId)).toMatchObject({ hash: HASH_1, source: 'cdm-import' });
    expect(rows.get(existing)).toMatchObject({ hash: HASH_2, source: 'cdm-import' });
    expect(rows.get(verified)).toMatchObject({ hash: HASH_3, source: 'cdm-import' });

    // The three of them are members now, and the global identities carry no hash.
    const members = await db
      .select({ userId: projectUsers.userId })
      .from(projectUsers)
      .where(and(eq(projectUsers.projectId, projectA)));
    expect(members.map((m) => m.userId)).toEqual(
      expect.arrayContaining([assigned.userId, existing, verified])
    );
    const methods = await db
      .select({ providerData: userAuthenticationMethods.providerData })
      .from(userAuthenticationMethods)
      .where(like(userAuthenticationMethods.providerId, `import-%-${tag}@example.test`));
    expect(JSON.stringify(methods)).not.toContain('$2');
    expect(JSON.stringify(methods)).not.toContain('hashedPassword');
  });

  it('rolls the whole import back when a password is for someone who is not a member', async () => {
    const before = keyed(await credentialsOf(projectA)).size;
    await createPerson('bystander');
    const failure = await importInto(
      projectA,
      [
        // Would be created and assigned...
        withPassword('rolled-back', HASH_1, [`viewer-${tag}`]),
        // ...but this one is not a member after the import.
        withPassword('bystander', HASH_2),
      ],
      { withRole: true }
    ).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ValidationError);
    const message = (failure as Error).message;
    expect(message).toContain('users[1]');
    expect(message).not.toContain('example.test');
    expect(message).not.toContain('$2');

    // Nothing of the import survived: no credential, no user, no membership.
    expect(keyed(await credentialsOf(projectA)).size).toBe(before);
    expect(
      await db
        .select({ id: userAuthenticationMethods.id })
        .from(userAuthenticationMethods)
        .where(eq(userAuthenticationMethods.providerId, emailOf('rolled-back')))
    ).toEqual([]);
    const bystander = await db
      .select({ userId: userAuthenticationMethods.userId })
      .from(userAuthenticationMethods)
      .where(eq(userAuthenticationMethods.providerId, emailOf('bystander')));
    expect(
      await db.select().from(projectUsers).where(eq(projectUsers.userId, bystander[0].userId))
    ).toEqual([]);
  });

  it('applies the provenance rules: replace an import, leave an identical one, never touch an owned one', async () => {
    const replaced = await createPerson('prov-replace', { memberOf: [projectA] });
    const same = await createPerson('prov-same', { memberOf: [projectA] });
    const owned = await createPerson('prov-owned', { memberOf: [projectA] });
    const changed = await createPerson('prov-change', { memberOf: [projectA] });
    await db.insert(projectUserCredentials).values([
      { projectId: projectA, userId: replaced, hash: HASH_1, source: 'cdm-import' },
      { projectId: projectA, userId: same, hash: HASH_2, source: 'cdm-import' },
      { projectId: projectA, userId: owned, hash: HASH_1, source: 'reset' },
      { projectId: projectA, userId: changed, hash: HASH_1, source: 'change' },
    ]);
    const before = keyed(await credentialsOf(projectA));

    const result = await importInto(projectA, [
      withPassword('prov-replace', HASH_3),
      withPassword('prov-same', HASH_2),
      withPassword('prov-owned', HASH_3),
      withPassword('prov-change', HASH_3),
    ]);

    expect(result).toMatchObject({
      passwordsImported: 0,
      passwordsUpdated: 1,
      passwordsUnchanged: 1,
      passwordsSkippedExisting: 2,
    });
    const after = keyed(await credentialsOf(projectA));
    expect(after.get(replaced)).toMatchObject({ hash: HASH_3, source: 'cdm-import' });
    expect(after.get(same)).toEqual(before.get(same));
    expect(after.get(owned)).toEqual(before.get(owned));
    expect(after.get(changed)).toEqual(before.get(changed));
  });

  it('keeps a credential when the row carries no password', async () => {
    const person = await createPerson('absent', { memberOf: [projectA] });
    await db
      .insert(projectUserCredentials)
      .values({ projectId: projectA, userId: person, hash: HASH_1, source: 'cdm-import' });

    const result = await importInto(projectA, [
      { key: { value: emailOf('absent'), findBy: CdmFindBy.Email }, name: `Person absent ${tag}` },
    ]);

    expect(result.passwordsImported + result.passwordsUpdated + result.passwordsUnchanged).toBe(0);
    expect(keyed(await credentialsOf(projectA)).get(person)).toMatchObject({
      hash: HASH_1,
      deletedAt: null,
    });
  });

  it("never reads or changes another project's credential for the same person", async () => {
    const both = await createPerson('both', { memberOf: [projectA, projectB] });
    const onlyB = await createPerson('only-b', { memberOf: [projectB] });
    await db.insert(projectUserCredentials).values([
      { projectId: projectB, userId: both, hash: HASH_1, source: 'reset' },
      { projectId: projectB, userId: onlyB, hash: HASH_2, source: 'cdm-import' },
    ]);
    const bBefore = keyed(await credentialsOf(projectB));
    let seenFromA: unknown;

    const result = await importInto(projectA, [withPassword('both', HASH_3)], {
      inspect: async (tx) => {
        // Inside A's tenant the restrictive select policy hides B's rows, even when asked for.
        seenFromA = await tx
          .select({ userId: projectUserCredentials.userId })
          .from(projectUserCredentials)
          .where(eq(projectUserCredentials.projectId, projectB));
      },
    });

    // B's owned credential does not make A's "existing": A gets its own.
    expect(result).toMatchObject({ passwordsImported: 1, passwordsSkippedExisting: 0 });
    expect(seenFromA).toEqual([]);
    expect(keyed(await credentialsOf(projectB))).toEqual(bBefore);
    expect(keyed(await credentialsOf(projectA)).get(both)).toMatchObject({
      hash: HASH_3,
      source: 'cdm-import',
    });
  });

  it('does not see another project members: a member of B only is not a member of A', async () => {
    await createPerson('b-member', { memberOf: [projectB] });
    const failure = await importInto(projectA, [withPassword('b-member', HASH_1)]).catch(
      (e: unknown) => e
    );

    expect(failure).toBeInstanceOf(ValidationError);
    expect((failure as Error).message).toContain('users[0]');
    expect(keyed(await credentialsOf(projectA)).size).toBeGreaterThan(0);
  });

  it('reads membership once and credentials once for a document of many rows', async () => {
    const people: UserRow[] = [];
    for (let i = 0; i < 30; i += 1) {
      await createPerson(`bulk-${i}`, { memberOf: [projectA] });
      people.push(withPassword(`bulk-${i}`, i % 2 === 0 ? HASH_1 : HASH_2));
    }
    queries.length = 0;

    const result = await importInto(projectA, people);

    expect(result.passwordsImported).toBe(30);
    const selects = (table: string) =>
      queries.filter(
        (q) => q.startsWith('select') && q.includes(`from "${table}"`) && / in \(/.test(q)
      );
    expect(selects('project_user_credentials')).toHaveLength(1);
    expect(selects('project_users')).toHaveLength(1);
    // No lookup of one credential at a time.
    expect(
      queries.filter(
        (q) =>
          q.startsWith('select') &&
          q.includes('from "project_user_credentials"') &&
          !/ in \(/.test(q)
      )
    ).toHaveLength(0);
  });
});
