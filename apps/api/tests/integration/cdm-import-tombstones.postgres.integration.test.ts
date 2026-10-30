/**
 * The deletion tombstone table against a real PostgreSQL: what only the database can show.
 *
 * Duplicate-safe inserts, one-query reads scoped to the project and kind, the unique index,
 * the cascade with the project, the table's shape (a fingerprint, no key, no user id) and
 * its row-level-security behaviour inside a project-scoped transaction.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (0093 included) and a login role that is a member of the RLS restricted role; without it
 * the file is skipped, so `pnpm test` stays database-free. It writes its own rows and removes
 * them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/cdm-import-tombstones.postgres.integration.test.ts
 */
import { cdmImportTombstones, projects, schema } from '@grantjs/database';
import { type Scope, Tenant } from '@grantjs/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fingerprintCdmExternalKey } from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import { scopeToRlsContext, setRlsContext } from '@/lib/rls';
import { CdmImportTombstoneRepository } from '@/repositories/cdm-import-tombstones.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;
const SECRET = 'integration-test-tombstone-secret';

describe.skipIf(!url)('CDM import tombstones on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 4, onnotice: () => {} });
  const db = drizzle(client, { schema });
  const repo = new CdmImportTombstoneRepository(db as never);
  const tag = Date.now().toString(36);
  const accountId = crypto.randomUUID();
  const cleanupProjects: string[] = [];
  let projectA: string;
  let projectB: string;

  const fp = (label: string, kind = 'user') =>
    fingerprintCdmExternalKey(kind, `person.${label}.${tag}@example.com`, SECRET);

  async function createProject(label: string): Promise<string> {
    const [row] = await db
      .insert(projects)
      .values({ name: `tombstone-${label}`, slug: `tombstone-${label}-${tag}` })
      .returning({ id: projects.id });
    cleanupProjects.push(row.id);
    return row.id;
  }

  const rowsOf = (projectId: string) =>
    db.select().from(cdmImportTombstones).where(eq(cdmImportTombstones.projectId, projectId));

  beforeAll(async () => {
    projectA = await createProject('a');
    projectB = await createProject('b');
  });

  afterAll(async () => {
    if (cleanupProjects.length > 0) {
      await db.delete(projects).where(inArray(projects.id, cleanupProjects));
    }
    await client.end();
  });

  it('records a tombstone, and a second recording of it is not an error and not a second row', async () => {
    const row = { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('dup') };
    await repo.insertIgnoringDuplicates([row]);
    await repo.insertIgnoringDuplicates([row, row]);

    const stored = (await rowsOf(projectA)).filter(
      (r) => r.externalKeyFingerprint === row.externalKeyFingerprint
    );
    expect(stored).toHaveLength(1);
  });

  it('inserts the new rows of a batch that also holds an existing one', async () => {
    await repo.insertIgnoringDuplicates([
      { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('mix-1') },
    ]);
    await repo.insertIgnoringDuplicates([
      { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('mix-1') },
      { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('mix-2') },
    ]);

    const found = await repo.filterTombstoned({
      projectId: projectA,
      kind: 'user',
      fingerprints: [fp('mix-1'), fp('mix-2')],
    });
    expect([...found].sort()).toEqual([fp('mix-1'), fp('mix-2')].sort());
  });

  it('does nothing for an empty batch', async () => {
    await expect(repo.insertIgnoringDuplicates([])).resolves.toBeUndefined();
  });

  it('answers with the subset of the asked fingerprints that is tombstoned, in one read', async () => {
    await repo.insertIgnoringDuplicates([
      { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('read-1') },
    ]);

    const found = await repo.filterTombstoned({
      projectId: projectA,
      kind: 'user',
      fingerprints: [fp('read-1'), fp('read-never-written')],
    });

    expect([...found]).toEqual([fp('read-1')]);
  });

  it('answers nothing for no fingerprints, and ignores an empty one', async () => {
    expect(
      (await repo.filterTombstoned({ projectId: projectA, kind: 'user', fingerprints: [] })).size
    ).toBe(0);
    expect(
      (await repo.filterTombstoned({ projectId: projectA, kind: 'user', fingerprints: [''] })).size
    ).toBe(0);
  });

  it("never matches another project's tombstone", async () => {
    await repo.insertIgnoringDuplicates([
      { projectId: projectB, kind: 'user', externalKeyFingerprint: fp('scoped') },
    ]);

    expect(
      (
        await repo.filterTombstoned({
          projectId: projectA,
          kind: 'user',
          fingerprints: [fp('scoped')],
        })
      ).size
    ).toBe(0);
    expect(
      (
        await repo.filterTombstoned({
          projectId: projectB,
          kind: 'user',
          fingerprints: [fp('scoped')],
        })
      ).size
    ).toBe(1);
  });

  it('keeps kinds apart: the same fingerprint under another kind is another row', async () => {
    const fingerprint = fp('kind');
    await repo.insertIgnoringDuplicates([
      { projectId: projectA, kind: 'user', externalKeyFingerprint: fingerprint },
      { projectId: projectA, kind: 'role', externalKeyFingerprint: fingerprint },
    ]);

    expect(
      (
        await repo.filterTombstoned({
          projectId: projectA,
          kind: 'group',
          fingerprints: [fingerprint],
        })
      ).size
    ).toBe(0);
    expect(
      (
        await repo.filterTombstoned({
          projectId: projectA,
          kind: 'role',
          fingerprints: [fingerprint],
        })
      ).size
    ).toBe(1);
  });

  it('enforces the unique index on (project, kind, fingerprint) below the repository', async () => {
    const values = { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('unique') };
    await db.insert(cdmImportTombstones).values(values);

    await expect(db.insert(cdmImportTombstones).values(values)).rejects.toThrow();
  });

  it('stores a fingerprint and nothing else: no key, no user id, no copy of the record', async () => {
    const columns = (await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'cdm_import_tombstones'
      ORDER BY column_name
    `)) as unknown as Array<{ column_name: string }>;

    expect(columns.map((c) => c.column_name)).toEqual([
      'created_at',
      'external_key_fingerprint',
      'id',
      'kind',
      'project_id',
    ]);
  });

  it('goes with its project', async () => {
    const doomed = await createProject('doomed');
    await repo.insertIgnoringDuplicates([
      { projectId: doomed, kind: 'user', externalKeyFingerprint: fp('cascade') },
    ]);
    expect(await rowsOf(doomed)).toHaveLength(1);

    await db.delete(projects).where(eq(projects.id, doomed));

    expect(await rowsOf(doomed)).toHaveLength(0);
  });

  it('is enabled for row-level security with the two policies project_users has', async () => {
    const policies = (await db.execute(sql`
      SELECT policyname, permissive, cmd FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'cdm_import_tombstones'
      ORDER BY policyname
    `)) as unknown as Array<{ policyname: string; permissive: string; cmd: string }>;
    const [enabled] = (await db.execute(sql`
      SELECT relrowsecurity FROM pg_class WHERE oid = 'public.cdm_import_tombstones'::regclass
    `)) as unknown as Array<{ relrowsecurity: boolean }>;

    expect(enabled.relrowsecurity).toBe(true);
    expect(policies).toEqual([
      { policyname: 'tenant_isolation_policy', permissive: 'RESTRICTIVE', cmd: 'SELECT' },
      { policyname: 'tenant_rls_allow', permissive: 'PERMISSIVE', cmd: 'ALL' },
    ]);
  });

  describe('inside a project-scoped RLS transaction, as the import runs it', () => {
    const scopeOf = (projectId: string): Scope => ({
      tenant: Tenant.AccountProject,
      id: `${accountId}:${projectId}`,
    });

    it('reads its own project tombstones and not another project', async () => {
      await repo.insertIgnoringDuplicates([
        { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('rls-a') },
        { projectId: projectB, kind: 'user', externalKeyFingerprint: fp('rls-b') },
      ]);

      const [seenFromA, bFromA] = await db.transaction(async (tx) => {
        await setRlsContext(tx as never, scopeToRlsContext(scopeOf(projectA)));
        return Promise.all([
          repo.filterTombstoned(
            { projectId: projectA, kind: 'user', fingerprints: [fp('rls-a')] },
            tx as never
          ),
          repo.filterTombstoned(
            { projectId: projectB, kind: 'user', fingerprints: [fp('rls-b')] },
            tx as never
          ),
        ]);
      });

      expect(seenFromA.size).toBe(1);
      expect(bFromA.size).toBe(0);
    });

    it('records a duplicate from a transaction scoped to another project without failing it', async () => {
      const row = { projectId: projectA, kind: 'user', externalKeyFingerprint: fp('rls-dup') };
      await repo.insertIgnoringDuplicates([row]);

      await db.transaction(async (tx) => {
        await setRlsContext(tx as never, scopeToRlsContext(scopeOf(projectB)));
        await repo.insertIgnoringDuplicates([row], tx as never);
        // The transaction is still usable: the duplicate did not abort it.
        await repo.insertIgnoringDuplicates(
          [{ projectId: projectA, kind: 'user', externalKeyFingerprint: fp('rls-dup-after') }],
          tx as never
        );
      });

      const stored = (await rowsOf(projectA)).filter((r) =>
        [fp('rls-dup'), fp('rls-dup-after')].includes(r.externalKeyFingerprint)
      );
      expect(stored).toHaveLength(2);
    });

    it('writes from a transaction scoped to another project: a self-deletion is not made in the imported project', async () => {
      await db.transaction(async (tx) => {
        await setRlsContext(tx as never, scopeToRlsContext(scopeOf(projectB)));
        await repo.insertIgnoringDuplicates(
          [{ projectId: projectA, kind: 'user', externalKeyFingerprint: fp('rls-cross') }],
          tx as never
        );
      });

      expect(
        (
          await repo.filterTombstoned({
            projectId: projectA,
            kind: 'user',
            fingerprints: [fp('rls-cross')],
          })
        ).size
      ).toBe(1);
    });
  });
});
