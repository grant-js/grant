/**
 * The CDM user-key lookup against a real PostgreSQL: what only the database can show.
 *
 * `findUserIdByCdmImport` matches the global user's `cdmImport` marker first and the live
 * membership row's second, for a live user only, in the importing project only.
 * `findLiveUserCdmMarkers` is the read behind the `key.grantUserId` match rule.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * and a login role that is a member of the RLS restricted role; without it the file is
 * skipped, so `pnpm test` stays database-free. It writes its own rows and removes them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/users-cdm-marker-lookup.postgres.integration.test.ts
 */
import { projects, projectUsers, schema, users } from '@grantjs/database';
import { type Scope, Tenant } from '@grantjs/schema';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { scopeToRlsContext, setRlsContext } from '@/lib/rls';
import { UserRepository } from '@/repositories/users.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;

describe.skipIf(!url)('CDM user marker lookup on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 4, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const repo = new UserRepository(db as never);
  const tag = Date.now().toString(36);
  const accountId = crypto.randomUUID();
  const cleanupUsers: string[] = [];
  const cleanupProjects: string[] = [];
  let projectA: string;
  let projectB: string;

  const keyOf = (label: string) => `lookup-${label}-${tag}`;
  const marker = (projectId: string, externalKey: string) => ({
    cdmImport: { projectId, kind: 'user', externalKey },
  });

  async function createProject(label: string): Promise<string> {
    const [row] = await db
      .insert(projects)
      .values({ name: `lookup-${label}`, slug: `lookup-${label}-${tag}` })
      .returning({ id: projects.id });
    cleanupProjects.push(row.id);
    return row.id;
  }

  async function createUser(
    label: string,
    options: {
      globalMetadata?: Record<string, unknown>;
      member?: { projectId: string; metadata?: Record<string, unknown>; deleted?: boolean };
      deleted?: boolean;
    } = {}
  ): Promise<string> {
    const [row] = await db
      .insert(users)
      .values({
        name: `lookup-${tag}-${label}`,
        metadata: options.globalMetadata ?? {},
        deletedAt: options.deleted ? new Date() : null,
      })
      .returning({ id: users.id });
    cleanupUsers.push(row.id);
    if (options.member) {
      await db.insert(projectUsers).values({
        projectId: options.member.projectId,
        userId: row.id,
        metadata: options.member.metadata ?? {},
        deletedAt: options.member.deleted ? new Date() : null,
      });
    }
    return row.id;
  }

  const lookup = (projectId: string, externalKey: string) =>
    repo.findUserIdByCdmImport({ projectId, kind: 'user', externalKey });

  beforeAll(async () => {
    projectA = await createProject('a');
    projectB = await createProject('b');
  });

  afterAll(async () => {
    if (cleanupUsers.length > 0) {
      await db.delete(projectUsers).where(inArray(projectUsers.userId, cleanupUsers));
      await db.delete(users).where(inArray(users.id, cleanupUsers));
    }
    if (cleanupProjects.length > 0) {
      await db.delete(projects).where(inArray(projects.id, cleanupProjects));
    }
    await client.end();
  });

  describe('findUserIdByCdmImport', () => {
    it('finds a user by the global marker', async () => {
      const key = keyOf('global');
      const id = await createUser('global', { globalMetadata: marker(projectA, key) });
      expect(await lookup(projectA, key)).toBe(id);
    });

    it('finds a user by the live membership row marker when the global metadata has none', async () => {
      const key = keyOf('row');
      const id = await createUser('row', {
        member: { projectId: projectA, metadata: marker(projectA, key) },
      });
      expect(await lookup(projectA, key)).toBe(id);
    });

    it('ranks the global marker before the membership row marker', async () => {
      const key = keyOf('rank');
      const viaRow = await createUser('rank-row', {
        member: { projectId: projectA, metadata: marker(projectA, key) },
      });
      const viaGlobal = await createUser('rank-global', { globalMetadata: marker(projectA, key) });
      expect(viaRow).not.toBe(viaGlobal);
      expect(await lookup(projectA, key)).toBe(viaGlobal);
    });

    it('finds nothing for a soft-deleted user, by global marker or by row marker', async () => {
      const globalKey = keyOf('deleted-global');
      const rowKey = keyOf('deleted-row');
      await createUser('deleted-global', {
        globalMetadata: marker(projectA, globalKey),
        deleted: true,
      });
      await createUser('deleted-row', {
        member: { projectId: projectA, metadata: marker(projectA, rowKey) },
        deleted: true,
      });
      expect(await lookup(projectA, globalKey)).toBeNull();
      expect(await lookup(projectA, rowKey)).toBeNull();
    });

    it('finds nothing for a soft-deleted membership row of a live user', async () => {
      const key = keyOf('deleted-membership');
      await createUser('deleted-membership', {
        member: { projectId: projectA, metadata: marker(projectA, key), deleted: true },
      });
      expect(await lookup(projectA, key)).toBeNull();
    });

    it("finds nothing for another project's row or global marker", async () => {
      const rowKey = keyOf('other-row');
      const globalKey = keyOf('other-global');
      await createUser('other-row', {
        member: { projectId: projectB, metadata: marker(projectB, rowKey) },
      });
      await createUser('other-global', { globalMetadata: marker(projectB, globalKey) });
      expect(await lookup(projectA, rowKey)).toBeNull();
      expect(await lookup(projectA, globalKey)).toBeNull();
      expect(await lookup(projectB, rowKey)).not.toBeNull();
    });

    it('does not match a row of this project whose marker names another project', async () => {
      const key = keyOf('wrong-project-in-row');
      await createUser('wrong-project-in-row', {
        member: { projectId: projectA, metadata: marker(projectB, key) },
      });
      expect(await lookup(projectA, key)).toBeNull();
    });

    it('matches the key and the kind exactly', async () => {
      const key = keyOf('exact');
      await createUser('exact', { globalMetadata: marker(projectA, key) });
      expect(await lookup(projectA, `${key}-x`)).toBeNull();
      expect(
        await repo.findUserIdByCdmImport({ projectId: projectA, kind: 'role', externalKey: key })
      ).toBeNull();
    });

    it('answers inside a project-scoped RLS transaction, as the import runs it', async () => {
      const key = keyOf('rls');
      const id = await createUser('rls', {
        member: { projectId: projectA, metadata: marker(projectA, key) },
      });
      const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectA}` };
      const found = await db.transaction(async (tx) => {
        await setRlsContext(tx as never, scopeToRlsContext(scope));
        return repo.findUserIdByCdmImport(
          { projectId: projectA, kind: 'user', externalKey: key },
          tx as never
        );
      });
      expect(found).toBe(id);
    });

    it('keeps both marker predicates servable by the existing GIN indexes', async () => {
      // On a near-empty table the planner has no statistics to prefer the GIN index over the
      // btree ones, so this asks the narrower question: with sequential scans off, is the
      // containment predicate on each table answered by its `metadata` GIN index? The old
      // `->>` equality could not be.
      const containment = JSON.stringify(marker(projectA, keyOf('plan')));
      const explain = async (statement: ReturnType<typeof sql>) =>
        db.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL enable_seqscan = off`);
          const rows = (await tx.execute(statement)) as unknown as Array<Record<string, string>>;
          return rows.map((r) => Object.values(r)[0]).join('\n');
        });

      expect(
        await explain(sql`EXPLAIN SELECT id FROM users WHERE metadata @> ${containment}::jsonb`)
      ).toContain('users_metadata_idx');
      expect(
        await explain(
          sql`EXPLAIN SELECT user_id FROM project_users WHERE metadata @> ${containment}::jsonb`
        )
      ).toContain('project_users_metadata_idx');
    });
  });

  describe('findLiveUserCdmMarkers', () => {
    it('returns both markers of a live user and its live row', async () => {
      const key = keyOf('markers');
      const id = await createUser('markers', {
        globalMetadata: marker(projectB, 'elsewhere'),
        member: { projectId: projectA, metadata: marker(projectA, key) },
      });
      expect(await repo.findLiveUserCdmMarkers({ userId: id, projectId: projectA })).toEqual({
        globalMarker: marker(projectB, 'elsewhere').cdmImport,
        membershipMarker: marker(projectA, key).cdmImport,
      });
    });

    it('returns null markers for a live user with none, and for a non-member', async () => {
      const id = await createUser('bare');
      expect(await repo.findLiveUserCdmMarkers({ userId: id, projectId: projectA })).toEqual({
        globalMarker: null,
        membershipMarker: null,
      });
    });

    it("ignores a soft-deleted membership row and another project's row", async () => {
      const id = await createUser('stale-rows', {
        member: { projectId: projectA, metadata: marker(projectA, 'gone'), deleted: true },
      });
      await db
        .insert(projectUsers)
        .values({ projectId: projectB, userId: id, metadata: marker(projectB, 'b-key') });
      expect(await repo.findLiveUserCdmMarkers({ userId: id, projectId: projectA })).toEqual({
        globalMarker: null,
        membershipMarker: null,
      });
    });

    it('returns null for a soft-deleted user and for an id that does not exist', async () => {
      const id = await createUser('deleted', { deleted: true });
      expect(await repo.findLiveUserCdmMarkers({ userId: id, projectId: projectA })).toBeNull();
      expect(
        await repo.findLiveUserCdmMarkers({
          userId: '00000000-0000-4000-8000-00000000dead',
          projectId: projectA,
        })
      ).toBeNull();
    });
  });
});
