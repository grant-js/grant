/**
 * Scoped credentials against a real PostgreSQL (ADR 0011 slice 1): the partial unique
 * indexes, the source check, the project RLS policy, the atomic lockout counter, the
 * cascades and the retention purge are all behaviour of the database, which a mocked
 * driver cannot show.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration
 * applied (`pnpm --filter @grantjs/database db:migrate`, which also grants the RLS
 * restricted role to the login role). It writes its own rows and removes them, but the
 * purge test deletes **every** soft-deleted credential row, so point it at a disposable
 * database only. Without
 * the variable the whole file is skipped, so `pnpm test` stays database-free.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/credentials.postgres.integration.test.ts
 */
import { GrantAuth } from '@grantjs/core';
import {
  projects,
  projectUserCredentialAuditLogs,
  projectUserCredentialLockouts,
  projectUserCredentials,
  schema,
  userCredentialAuditLogs,
  userCredentialLockouts,
  userCredentials,
  users,
} from '@grantjs/database';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DrizzleAuditLogger } from '@/lib/audit';
import { BasePoolPlatformCredentialConnection } from '@/lib/platform-credential-connection.lib';
import {
  ProjectUserCredentialLockoutRepository,
  UserCredentialLockoutRepository,
} from '@/repositories/credential-lockouts.repository';
import { ProjectUserCredentialRepository } from '@/repositories/project-user-credentials.repository';
import { UserCredentialRepository } from '@/repositories/user-credentials.repository';
import { CredentialLockoutService } from '@/services/credential-lockouts.service';
import { CredentialService } from '@/services/credentials.service';

const url = process.env.GRANT_TEST_DATABASE_URL;

const HASH_A = '$2b$04$' + 'a'.repeat(53);
const HASH_B = '$2b$04$' + 'b'.repeat(53);
const POLICY = { maxAttempts: 5, windowMs: 15 * 60_000, lockDurationMs: 15 * 60_000 };

describe.skipIf(!url)('scoped credentials on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 10, onnotice: () => {} });
  const db = drizzle(client, { schema });

  const platformRepo = new UserCredentialRepository(db);
  const projectRepo = new ProjectUserCredentialRepository(db);
  const platformLockouts = new UserCredentialLockoutRepository(db);
  const projectLockouts = new ProjectUserCredentialLockoutRepository(db);

  let userA: string;
  let userB: string;
  let projectA: string;
  let projectB: string;

  beforeAll(async () => {
    const tag = Date.now().toString(36);
    const insertedUsers = await db
      .insert(users)
      .values([{ name: `cred-test-a-${tag}` }, { name: `cred-test-b-${tag}` }])
      .returning({ id: users.id });
    [userA, userB] = insertedUsers.map((u) => u.id);
    const insertedProjects = await db
      .insert(projects)
      .values([
        { name: 'cred-test-a', slug: `cred-test-a-${tag}` },
        { name: 'cred-test-b', slug: `cred-test-b-${tag}` },
      ])
      .returning({ id: projects.id });
    [projectA, projectB] = insertedProjects.map((p) => p.id);
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, [userA, userB]));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await client.end();
  });

  describe('platform scope', () => {
    it('creates, replaces in place, soft-deletes and recreates under the partial unique index', async () => {
      const scope = { scope: 'platform' } as const;

      const created = await platformRepo.upsert(scope, {
        userId: userA,
        hash: HASH_A,
        source: 'register',
      });
      expect(created).toMatchObject({ scope: 'platform', projectId: null, source: 'register' });
      expect(created).not.toHaveProperty('hash');

      const replaced = await platformRepo.upsert(scope, {
        userId: userA,
        hash: HASH_B,
        source: 'reset',
      });
      expect(replaced.id).toBe(created.id);
      expect(replaced.source).toBe('reset');
      expect((await platformRepo.findActive(scope, userA))?.hash).toBe(HASH_B);

      const removed = await platformRepo.softDelete(scope, userA);
      expect(removed?.id).toBe(created.id);
      expect(await platformRepo.findActive(scope, userA)).toBeNull();
      expect(await platformRepo.softDelete(scope, userA)).toBeNull();

      const recreated = await platformRepo.upsert(scope, {
        userId: userA,
        hash: HASH_A,
        source: 'change',
      });
      expect(recreated.id).not.toBe(created.id);

      const rows = await db
        .select({ id: userCredentials.id, deletedAt: userCredentials.deletedAt })
        .from(userCredentials)
        .where(eq(userCredentials.userId, userA));
      expect(rows).toHaveLength(2);
      expect(rows.filter((r) => r.deletedAt === null)).toHaveLength(1);

      await expect(platformRepo.purgeSoftDeleted()).resolves.toBeGreaterThanOrEqual(1);
      expect(await platformRepo.findActive(scope, userA)).not.toBeNull();
      const remaining = await db
        .select({ id: userCredentials.id })
        .from(userCredentials)
        .where(eq(userCredentials.userId, userA));
      expect(remaining).toHaveLength(1);
      await platformRepo.softDelete(scope, userA);
      await platformRepo.purgeSoftDeleted();
    });

    it('rejects a second live row and an unknown source in the database itself', async () => {
      await db.insert(userCredentials).values({ userId: userB, hash: HASH_A, source: 'register' });
      await expect(
        db.insert(userCredentials).values({ userId: userB, hash: HASH_B, source: 'register' })
      ).rejects.toMatchObject({ cause: { code: '23505' } });
      await expect(
        db.insert(userCredentials).values({ userId: userA, hash: HASH_A, source: 'bogus' })
      ).rejects.toMatchObject({ cause: { code: '23514' } });
      await db.delete(userCredentials).where(eq(userCredentials.userId, userB));
    });

    it('does not put the hash into the message of a failed write', async () => {
      const bogusUser = '00000000-0000-4000-8000-0000000000ff';
      const error = await platformRepo
        .upsert({ scope: 'platform' }, { userId: bogusUser, hash: HASH_A, source: 'register' })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(String((error as Error).message)).not.toContain(HASH_A);
      expect(String((error as Error).message)).toMatch(/SQLSTATE 23503/);
    });
  });

  describe('project scope', () => {
    it('keeps one live credential per (project, user) and isolates projects', async () => {
      const scopeA = { scope: 'project', projectId: projectA } as const;
      const scopeB = { scope: 'project', projectId: projectB } as const;

      const a = await projectRepo.upsert(scopeA, {
        userId: userA,
        hash: HASH_A,
        source: 'cdm-import',
      });
      const b = await projectRepo.upsert(scopeB, {
        userId: userA,
        hash: HASH_B,
        source: 'cdm-import',
      });
      expect(a.id).not.toBe(b.id);
      expect(a.projectId).toBe(projectA);

      const replaced = await projectRepo.upsert(scopeA, {
        userId: userA,
        hash: HASH_B,
        source: 'reset',
      });
      expect(replaced.id).toBe(a.id);
      expect((await projectRepo.findActive(scopeA, userA))?.hash).toBe(HASH_B);
      expect((await projectRepo.findActive(scopeB, userA))?.hash).toBe(HASH_B);
      expect(await projectRepo.findActive(scopeA, userB)).toBeNull();

      expect((await projectRepo.softDelete(scopeA, userA))?.id).toBe(a.id);
      expect(await projectRepo.findActive(scopeA, userA)).toBeNull();
      expect(await projectRepo.findActive(scopeB, userA)).not.toBeNull();

      await projectRepo.upsert(scopeA, { userId: userA, hash: HASH_A, source: 'reset' });
      expect(await projectRepo.listActiveForUser(userA)).toHaveLength(2);
      expect(await projectRepo.softDeleteAllForUser(userA)).toHaveLength(2);
      expect(await projectRepo.listActiveForUser(userA)).toHaveLength(0);
      await expect(projectRepo.purgeSoftDeleted()).resolves.toBeGreaterThanOrEqual(3);
    });

    it('reads several users of one project in one call, without soft-deleted rows or other projects', async () => {
      const scopeA = { scope: 'project', projectId: projectA } as const;
      const scopeB = { scope: 'project', projectId: projectB } as const;
      await projectRepo.upsert(scopeA, { userId: userA, hash: HASH_A, source: 'cdm-import' });
      await projectRepo.upsert(scopeA, { userId: userB, hash: HASH_B, source: 'reset' });
      await projectRepo.upsert(scopeB, { userId: userA, hash: HASH_B, source: 'reset' });

      const found = await projectRepo.findActiveMany(scopeA, [userA, userB]);
      expect(found.map((r) => [r.userId, r.projectId, r.hash, r.source]).sort()).toEqual(
        [
          [userA, projectA, HASH_A, 'cdm-import'],
          [userB, projectA, HASH_B, 'reset'],
        ].sort()
      );
      expect(await projectRepo.findActiveMany(scopeA, [])).toEqual([]);
      expect(await projectRepo.findActiveMany(scopeA, [userA])).toHaveLength(1);

      await projectRepo.softDelete(scopeA, userB);
      expect(
        (await projectRepo.findActiveMany(scopeA, [userA, userB])).map((r) => r.userId)
      ).toEqual([userA]);
      expect(
        (await projectRepo.findActiveMany(scopeB, [userA, userB])).map((r) => r.projectId)
      ).toEqual([projectB]);

      await projectRepo.softDeleteAllForUser(userA);
      await projectRepo.softDeleteAllForUser(userB);
      await projectRepo.purgeSoftDeleted();
    });

    it('locks what findActiveMany returned until the transaction ends, so a concurrent reset waits', async () => {
      const scope = { scope: 'project', projectId: projectA } as const;
      await projectRepo.upsert(scope, { userId: userA, hash: HASH_A, source: 'cdm-import' });

      await db.transaction(async (tx) => {
        expect(await projectRepo.findActiveMany(scope, [userA], tx as never)).toHaveLength(1);

        // Another connection cannot change the row while the import's decision stands.
        const other = db.transaction(async (tx2) => {
          await tx2.execute(sql`SET LOCAL lock_timeout = '300ms'`);
          await projectRepo.upsert(
            scope,
            { userId: userA, hash: HASH_B, source: 'reset' },
            tx2 as never
          );
        });
        // The repository reports the SQLSTATE (lock_not_available) and nothing of the write.
        await expect(other).rejects.toThrow(/SQLSTATE 55P03/);
      });

      // Once the first transaction is over, the write goes through.
      await projectRepo.upsert(scope, { userId: userA, hash: HASH_B, source: 'reset' });
      expect((await projectRepo.findActive(scope, userA))?.source).toBe('reset');
      await projectRepo.softDeleteAllForUser(userA);
      await projectRepo.purgeSoftDeleted();
    });

    it("upsertImported replaces an earlier import but never a person's own password", async () => {
      const scope = { scope: 'project', projectId: projectA } as const;
      await projectRepo.upsert(scope, { userId: userA, hash: HASH_A, source: 'cdm-import' });

      const replaced = await projectRepo.upsertImported(scope, {
        userId: userA,
        hash: HASH_B,
        source: 'cdm-import',
      });
      expect(replaced).toMatchObject({ source: 'cdm-import' });
      expect((await projectRepo.findActive(scope, userA))?.hash).toBe(HASH_B);

      await projectRepo.upsert(scope, { userId: userA, hash: HASH_A, source: 'reset' });
      const refused = await projectRepo.upsertImported(scope, {
        userId: userA,
        hash: HASH_B,
        source: 'cdm-import',
      });
      expect(refused).toBeNull();
      expect(await projectRepo.findActive(scope, userA)).toMatchObject({
        hash: HASH_A,
        source: 'reset',
      });

      // No live row at all: it is a plain insert.
      await projectRepo.softDelete(scope, userA);
      const inserted = await projectRepo.upsertImported(scope, {
        userId: userA,
        hash: HASH_B,
        source: 'cdm-import',
      });
      expect(inserted).toMatchObject({ source: 'cdm-import' });

      await projectRepo.softDeleteAllForUser(userA);
      await projectRepo.purgeSoftDeleted();
    });

    it('a first-time reset racing an import wins: the import waits for it, then leaves it alone', async () => {
      const scope = { scope: 'project', projectId: projectA } as const;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));

      // The reset inserts the person's first credential and has not committed yet, so the
      // import's batched read (rows with no credential: nothing to lock) saw none.
      const reset = db.transaction(async (tx) => {
        await projectRepo.upsert(
          scope,
          { userId: userA, hash: HASH_A, source: 'reset' },
          tx as never
        );
        await gate;
      });
      await sleep(150);
      const imported = projectRepo.upsertImported(scope, {
        userId: userA,
        hash: HASH_B,
        source: 'cdm-import',
      });
      await sleep(250);
      release();
      await reset;

      expect(await imported).toBeNull();
      expect(await projectRepo.findActive(scope, userA)).toMatchObject({
        hash: HASH_A,
        source: 'reset',
      });

      await projectRepo.softDeleteAllForUser(userA);
      await projectRepo.purgeSoftDeleted();
    });

    it('rejects a second live row for the same (project, user)', async () => {
      await db
        .insert(projectUserCredentials)
        .values({ projectId: projectA, userId: userA, hash: HASH_A, source: 'register' });
      await expect(
        db
          .insert(projectUserCredentials)
          .values({ projectId: projectA, userId: userA, hash: HASH_B, source: 'register' })
      ).rejects.toMatchObject({ cause: { code: '23505' } });
      await db.delete(projectUserCredentials).where(eq(projectUserCredentials.userId, userA));
    });

    it('applies the project RLS policy to the restricted role, like the sibling pivots', async () => {
      await db.insert(projectUserCredentials).values([
        { projectId: projectA, userId: userA, hash: HASH_A, source: 'register' },
        { projectId: projectB, userId: userB, hash: HASH_B, source: 'register' },
      ]);

      const visibleProjects = async (currentProjectId: string) =>
        db.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL ROLE grant_app_restricted`);
          await tx.execute(
            sql`SELECT set_config('app.current_project_id', ${currentProjectId}, true)`
          );
          const rows = await tx
            .select({ projectId: projectUserCredentials.projectId })
            .from(projectUserCredentials)
            .where(inArray(projectUserCredentials.userId, [userA, userB]));
          return rows.map((r) => r.projectId).sort();
        });

      expect(await visibleProjects(projectA)).toEqual([projectA]);
      expect(await visibleProjects(projectB)).toEqual([projectB]);
      // Unscoped requests see every row, which is the sibling policy's behaviour too.
      expect(await visibleProjects('')).toEqual([projectA, projectB].sort());

      await db
        .delete(projectUserCredentials)
        .where(inArray(projectUserCredentials.userId, [userA, userB]));
    });
  });

  describe('lockout store', () => {
    const now = new Date('2026-10-16T10:00:00.000Z');
    const later = (ms: number) => new Date(now.getTime() + ms);

    it('counts failures, locks at the limit and does not extend an active lock', async () => {
      const scope = { scope: 'platform' } as const;
      let state = await platformLockouts.recordFailure(scope, userA, POLICY, now);
      expect(state).toEqual({ failedAttempts: 1, lockedUntil: null });
      for (let i = 2; i <= 4; i += 1) {
        state = await platformLockouts.recordFailure(scope, userA, POLICY, later(i * 1000));
        expect(state).toEqual({ failedAttempts: i, lockedUntil: null });
      }
      const locked = await platformLockouts.recordFailure(scope, userA, POLICY, later(5000));
      expect(locked.failedAttempts).toBe(5);
      expect(locked.lockedUntil?.getTime()).toBe(later(5000 + POLICY.lockDurationMs).getTime());

      const again = await platformLockouts.recordFailure(scope, userA, POLICY, later(60_000));
      expect(again.failedAttempts).toBe(6);
      expect(again.lockedUntil?.getTime()).toBe(locked.lockedUntil?.getTime());

      await platformLockouts.reset(scope, userA);
      expect(await platformLockouts.getState(scope, userA)).toBeNull();
    });

    it('restarts the count after the window or the lock has lapsed', async () => {
      const scope = { scope: 'project', projectId: projectA } as const;
      await projectLockouts.recordFailure(scope, userA, POLICY, now);
      await projectLockouts.recordFailure(scope, userA, POLICY, later(1000));
      const afterWindow = await projectLockouts.recordFailure(
        scope,
        userA,
        POLICY,
        later(POLICY.windowMs + 1000)
      );
      expect(afterWindow).toEqual({ failedAttempts: 1, lockedUntil: null });

      for (let i = 0; i < 4; i += 1) {
        await projectLockouts.recordFailure(
          scope,
          userA,
          POLICY,
          later(POLICY.windowMs + 2000 + i)
        );
      }
      const afterLock = await projectLockouts.recordFailure(
        scope,
        userA,
        { ...POLICY, windowMs: 24 * 3600_000 },
        later(POLICY.windowMs + 2000 + POLICY.lockDurationMs + 1000)
      );
      expect(afterLock).toEqual({ failedAttempts: 1, lockedUntil: null });
      await projectLockouts.reset(scope, userA);
    });

    it('is keyed per (scope, user): another project, platform and user are unaffected', async () => {
      const scopeA = { scope: 'project', projectId: projectA } as const;
      const scopeB = { scope: 'project', projectId: projectB } as const;
      await projectLockouts.recordFailure(scopeA, userA, POLICY, now);
      expect(await projectLockouts.getState(scopeB, userA)).toBeNull();
      expect(await projectLockouts.getState(scopeA, userB)).toBeNull();
      expect(await platformLockouts.getState({ scope: 'platform' }, userA)).toBeNull();
      await projectLockouts.resetAllForUser(userA);
      expect(await projectLockouts.getState(scopeA, userA)).toBeNull();
    });

    it('does not lose a count when failures arrive in parallel', async () => {
      const scope = { scope: 'platform' } as const;
      const attempts = 25;
      await Promise.all(
        Array.from({ length: attempts }, () =>
          platformLockouts.recordFailure(scope, userB, POLICY, now)
        )
      );
      expect((await platformLockouts.getState(scope, userB))?.failedAttempts).toBe(attempts);
      await platformLockouts.reset(scope, userB);
    });
  });

  describe('cascades', () => {
    it('removes credentials and lockouts with the user, and project credentials with the project', async () => {
      const [{ id: doomedUser }] = await db
        .insert(users)
        .values({ name: 'cred-test-doomed' })
        .returning({ id: users.id });
      const [{ id: doomedProject }] = await db
        .insert(projects)
        .values({ name: 'cred-test-doomed', slug: `cred-test-doomed-${Date.now()}` })
        .returning({ id: projects.id });

      await db
        .insert(userCredentials)
        .values({ userId: doomedUser, hash: HASH_A, source: 'register' });
      await db
        .insert(projectUserCredentials)
        .values({ projectId: doomedProject, userId: doomedUser, hash: HASH_A, source: 'register' });
      await db
        .insert(userCredentialLockouts)
        .values({ userId: doomedUser, failedAttempts: 1, windowStartedAt: new Date() });
      await db.insert(projectUserCredentialLockouts).values({
        projectId: doomedProject,
        userId: doomedUser,
        failedAttempts: 1,
        windowStartedAt: new Date(),
      });

      await db.delete(projects).where(eq(projects.id, doomedProject));
      expect(
        await db
          .select({ id: projectUserCredentials.id })
          .from(projectUserCredentials)
          .where(eq(projectUserCredentials.userId, doomedUser))
      ).toHaveLength(0);
      expect(
        await db
          .select({ id: projectUserCredentialLockouts.userId })
          .from(projectUserCredentialLockouts)
          .where(eq(projectUserCredentialLockouts.userId, doomedUser))
      ).toHaveLength(0);

      await db.delete(users).where(eq(users.id, doomedUser));
      expect(
        await db
          .select({ id: userCredentials.id })
          .from(userCredentials)
          .where(eq(userCredentials.userId, doomedUser))
      ).toHaveLength(0);
      expect(
        await db
          .select({ id: userCredentialLockouts.userId })
          .from(userCredentialLockouts)
          .where(eq(userCredentialLockouts.userId, doomedUser))
      ).toHaveLength(0);
    });
  });

  describe('service on real repositories', () => {
    const auth = (userId: string) => ({ userId }) as unknown as GrantAuth;

    const connection = new BasePoolPlatformCredentialConnection(db);

    function buildService(performedBy: string) {
      return new CredentialService(
        { platform: platformRepo, project: projectRepo },
        {
          platform: new DrizzleAuditLogger(
            userCredentialAuditLogs,
            'userCredentialId',
            auth(performedBy),
            db
          ),
          project: new DrizzleAuditLogger(
            projectUserCredentialAuditLogs,
            'projectUserCredentialId',
            auth(performedBy),
            db
          ),
        },
        new CredentialLockoutService(
          { platform: platformLockouts, project: projectLockouts },
          POLICY,
          connection
        ),
        connection,
        // The event is not under test here (see credentials.service.test.ts).
        { publishPasswordSet: async () => undefined }
      );
    }

    it('verifies, answers false on a miss, soft-deletes on erasure and writes audit rows without the hash', async () => {
      const service = buildService(userA);
      const platform = { scope: 'platform' } as const;
      const project = { scope: 'project', projectId: projectA } as const;
      const password = 'Correct-Horse-7-Staple!';

      const record = await service.setPassword({
        scope: platform,
        userId: userB,
        password,
        source: 'register',
      });
      await service.setPassword({
        scope: project,
        userId: userB,
        password: 'Project-Only-Pw-1!',
        source: 'reset',
      });

      expect(await service.verifyPassword({ scope: platform, userId: userB, password })).toBe(true);
      expect(
        await service.verifyPassword({ scope: platform, userId: userB, password: 'nope' })
      ).toBe(false);
      // No cross-scope read: the platform password is not the project credential.
      expect(await service.verifyPassword({ scope: project, userId: userB, password })).toBe(false);
      expect(await service.verifyPassword({ scope: project, userId: userA, password })).toBe(false);
      expect((await service.getCredential(platform, userB))?.lastUsedAt).toBeInstanceOf(Date);

      const stored = await platformRepo.findActive(platform, userB);
      const audits = await db
        .select()
        .from(userCredentialAuditLogs)
        .where(eq(userCredentialAuditLogs.userCredentialId, record.id));
      expect(audits.length).toBeGreaterThan(0);
      const projectAudits = await db
        .select()
        .from(projectUserCredentialAuditLogs)
        .where(eq(projectUserCredentialAuditLogs.performedBy, userA));
      for (const row of [...audits, ...projectAudits]) {
        expect(JSON.stringify(row)).not.toContain(stored?.hash);
        expect(JSON.stringify(row)).not.toContain('$2');
      }

      expect(await service.listForUser(userB)).toHaveLength(2);
      expect(await service.removeAllForUser(userB)).toBe(2);
      expect(await service.listForUser(userB)).toHaveLength(0);
      expect(await service.hasCredential(platform, userB)).toBe(false);

      const purged = await service.purgeSoftDeleted();
      expect(purged.platform).toBeGreaterThanOrEqual(1);
      expect(purged.project).toBeGreaterThanOrEqual(1);
    });
  });
});
