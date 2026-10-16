/**
 * Project-app password reset against a real PostgreSQL (ADR 0011 slice 5): token storage,
 * the atomic per-address limit, single use under concurrency, the one-transaction completion
 * and the bulk revoke of a user's grants in one project.
 *
 * The services are the real ones over a real database; only the mailer and the cache are
 * fakes. Each completion is one database transaction, as in production.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (see `credentials.postgres.integration.test.ts`); skipped otherwise. It writes its own
 * rows and removes them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/project-password-reset.postgres.integration.test.ts
 */
import {
  projectApps,
  projectOAuthGrants,
  projectPasswordResets,
  projects,
  projectUserCredentialLockouts,
  projectUserCredentials,
  projectUsers,
  schema,
  userAuthenticationMethods,
  userCredentials,
  users,
} from '@grantjs/database';
import { createHash } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const url = process.env.GRANT_TEST_DATABASE_URL;

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return { ...actual, hashSecret: (value: string) => actual.hashSecret(value, 4) };
});

const { ProjectPasswordResetHandler } = await import('@/handlers/project-password-reset.handler');
const { DrizzleTransactionalConnection } = await import('@/lib/transaction-manager.lib');
const { createRepositories } = await import('@/repositories');
const { createServices } = await import('@/services');
const { ProjectPasswordResetService } = await import('@/services/project-password-resets.service');

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

const REDIRECT_URI = 'https://example.com/callback';
const OLD_PASSWORD = 'Old-P4ssword!x';
const NEW_PASSWORD = 'Zq7!mKp2#vXw';
const TTL_MS = 30 * 60_000;
const WINDOW_MS = 60 * 60_000;
const MAX_REQUESTS = 5;

describe.skipIf(!url)('project password reset on PostgreSQL', () => {
  const client = postgres(url ?? 'postgres://unused', { max: 30, onnotice: () => {} });
  const db = drizzle(client, { schema });

  const tag = Date.now().toString(36);
  const email = `reset-${tag}@example.com`;
  let memberId: string;
  let otherUserId: string;
  let strangerId: string;
  let projectId: string;
  let otherProjectId: string;
  let appId: string;
  let secondAppId: string;
  let retiredAppId: string;
  let otherProjectAppId: string;
  let methodId: string;
  let clock = new Date();

  const cacheStore = new Map<string, unknown>();
  const cache = {
    oauth: {
      set: async (key: string, value: unknown) => void cacheStore.set(key, structuredClone(value)),
      get: async (key: string) => cacheStore.get(key) ?? null,
      delete: async (key: string) => void cacheStore.delete(key),
    },
  };
  const sent: Array<{ to: string; resetUrl: string }> = [];
  const email_ = {
    sendProjectPasswordReset: async (params: { to: string; resetUrl: string }) => {
      sent.push(params);
    },
  };

  beforeAll(async () => {
    const insertUser = async (name: string) =>
      (
        await db
          .insert(users)
          .values({ name: `${name}-${tag}` })
          .returning({ id: users.id })
      )[0].id;
    memberId = await insertUser('reset-member');
    otherUserId = await insertUser('reset-other');
    strangerId = await insertUser('reset-stranger');
    const insertProject = async (slug: string) =>
      (
        await db
          .insert(projects)
          .values({ name: slug, slug: `${slug}-${tag}` })
          .returning({ id: projects.id })
      )[0].id;
    projectId = await insertProject('reset-p1');
    otherProjectId = await insertProject('reset-p2');
    const insertApp = async (pid: string, clientId: string, deleted = false) =>
      (
        await db
          .insert(projectApps)
          .values({
            projectId: pid,
            clientId: `${clientId}-${tag}`,
            redirectUris: [REDIRECT_URI],
            enabledProviders: ['password'],
            name: 'Docs',
            deletedAt: deleted ? new Date() : null,
          })
          .returning({ id: projectApps.id })
      )[0].id;
    appId = await insertApp(projectId, 'app-1');
    secondAppId = await insertApp(projectId, 'app-1b');
    retiredAppId = await insertApp(projectId, 'app-retired', true);
    otherProjectAppId = await insertApp(otherProjectId, 'app-2');

    methodId = (
      await db
        .insert(userAuthenticationMethods)
        .values({
          userId: memberId,
          provider: 'email',
          providerId: email,
          providerData: {},
          isVerified: false,
        })
        .returning({ id: userAuthenticationMethods.id })
    )[0].id;
    await db.insert(projectUsers).values([
      { projectId, userId: memberId },
      { projectId, userId: otherUserId },
      { projectId: otherProjectId, userId: memberId },
    ]);
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, [memberId, otherUserId, strangerId]));
    await db.delete(projects).where(inArray(projects.id, [projectId, otherProjectId]));
    await client.end();
  });

  beforeEach(async () => {
    clock = new Date();
    cacheStore.clear();
    sent.length = 0;
    await db.delete(projectPasswordResets).where(eq(projectPasswordResets.userId, memberId));
    await db.delete(projectUserCredentials).where(eq(projectUserCredentials.userId, memberId));
    await db
      .delete(projectUserCredentialLockouts)
      .where(eq(projectUserCredentialLockouts.userId, memberId));
    await db.delete(userCredentials).where(eq(userCredentials.userId, memberId));
    await db
      .delete(projectOAuthGrants)
      .where(inArray(projectOAuthGrants.userId, [memberId, otherUserId]));
    await db
      .update(userAuthenticationMethods)
      .set({ isVerified: false })
      .where(eq(userAuthenticationMethods.id, methodId));
    await db
      .insert(projectUsers)
      .values({ projectId, userId: memberId })
      .onConflictDoUpdate({
        target: [projectUsers.projectId, projectUsers.userId],
        targetWhere: sql`${projectUsers.deletedAt} IS NULL`,
        set: { deletedAt: null },
      });
  });

  /** The wiring of one request: real services over `tx`, a clock under the test's control. */
  function wiring(tx: typeof db, policy = { maxRequests: MAX_REQUESTS }) {
    const repositories = createRepositories(tx as never);
    const services = createServices(
      repositories,
      { userId: memberId } as never,
      tx as never,
      {} as never,
      {} as never,
      { durableDb: db as never }
    );
    const resets = new ProjectPasswordResetService(
      repositories.projectPasswordResetRepository,
      { tokenTtlMs: TTL_MS, maxRequests: policy.maxRequests, windowMs: WINDOW_MS },
      () => clock
    );
    const handler = new ProjectPasswordResetHandler(
      services.projectApps,
      services.projectUsers,
      services.userAuthenticationMethods,
      services.credentials,
      services.credentialLockouts,
      resets,
      services.projectOAuthGrants,
      email_ as never,
      cache as never,
      new DrizzleTransactionalConnection(tx as never)
    );
    return { handler, services, resets };
  }

  const clientId = () => `app-1-${tag}`;
  const request = (address = email) =>
    wiring(db).handler.requestReset({
      clientId: clientId(),
      redirectUri: REDIRECT_URI,
      email: address,
    });
  const complete = (token: string, password = NEW_PASSWORD) =>
    wiring(db).handler.completeReset({
      clientId: clientId(),
      redirectUri: REDIRECT_URI,
      token,
      password,
    });
  const tokenOf = (resetUrl: string) =>
    new URLSearchParams(new URL(resetUrl).hash.replace(/^#/, '')).get('token')!;
  async function requestedToken() {
    await request();
    return tokenOf(sent.at(-1)!.resetUrl);
  }

  const resetRow = async (userId = memberId, project = projectId) =>
    (
      await db
        .select({
          tokenHash: projectPasswordResets.tokenHash,
          requestCount: projectPasswordResets.requestCount,
          expiresAt: projectPasswordResets.expiresAt,
          consumedAt: projectPasswordResets.consumedAt,
          authMethodId: projectPasswordResets.authMethodId,
        })
        .from(projectPasswordResets)
        .where(
          and(
            eq(projectPasswordResets.userId, userId),
            eq(projectPasswordResets.projectId, project)
          )
        )
    )[0] ?? null;

  const credentialRow = async (project = projectId) =>
    (
      await db
        .select({ source: projectUserCredentials.source, hash: projectUserCredentials.hash })
        .from(projectUserCredentials)
        .where(
          and(
            eq(projectUserCredentials.userId, memberId),
            eq(projectUserCredentials.projectId, project)
          )
        )
    )[0] ?? null;

  async function seedGrant(userId: string, app: string, deleted = false) {
    const [row] = await db
      .insert(projectOAuthGrants)
      .values({
        projectAppId: app,
        userId,
        scopeTenant: 'organizationProject',
        scopeId: `scope-${Math.random().toString(36).slice(2)}`,
        token: `tok-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        deletedAt: deleted ? new Date() : null,
      })
      .returning({ id: projectOAuthGrants.id });
    return row.id;
  }
  const grantDeleted = async (id: string) =>
    (
      await db
        .select({ deletedAt: projectOAuthGrants.deletedAt })
        .from(projectOAuthGrants)
        .where(eq(projectOAuthGrants.id, id))
    )[0].deletedAt !== null;

  describe('token storage', () => {
    it('stores the SHA-256 digest of the mailed token and the plain token nowhere', async () => {
      const token = await requestedToken();

      const row = await resetRow();
      expect(row?.tokenHash).toBe(sha256(token));
      expect(row?.tokenHash).not.toBe(token);
      expect(row?.authMethodId).toBe(methodId);
      expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const everywhere = await db.execute(
        sql`SELECT count(*)::int AS n FROM project_password_resets WHERE project_password_resets::text LIKE ${`%${token}%`}`
      );
      expect((everywhere as unknown as Array<{ n: number }>)[0].n).toBe(0);
    });

    it('creates no row, and sends nothing, for an unknown address or a non-member', async () => {
      await request(`nobody-${tag}@example.com`);
      await db
        .update(projectUsers)
        .set({ deletedAt: new Date() })
        .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, memberId)));
      await request();

      expect(sent).toHaveLength(0);
      expect(await resetRow()).toBeNull();
    });

    it('is one row per (project, user): a new link replaces the digest and the old link dies', async () => {
      const first = await requestedToken();
      const second = await requestedToken();

      expect(
        (
          await db
            .select()
            .from(projectPasswordResets)
            .where(eq(projectPasswordResets.userId, memberId))
        ).length
      ).toBe(1);
      expect((await resetRow())?.tokenHash).toBe(sha256(second));
      await expect(complete(first)).rejects.toThrow('Invalid or expired password reset link');
      await complete(second);
      expect(await credentialRow()).toMatchObject({ source: 'reset' });
    });

    it('keeps tokens apart between projects: the other project cannot use this one', async () => {
      const token = await requestedToken();

      await expect(
        wiring(db).handler.completeReset({
          clientId: `app-2-${tag}`,
          redirectUri: REDIRECT_URI,
          token,
          password: NEW_PASSWORD,
        })
      ).rejects.toThrow('Invalid or expired password reset link');
      expect(await credentialRow(otherProjectId)).toBeNull();
      // The foreign attempt did not use it up.
      expect((await resetRow())?.tokenHash).toBe(sha256(token));
    });
  });

  describe('the per-address limit', () => {
    it('is atomic: concurrent requests spend exactly the budget, no more', async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          wiring(db).resets.issueToken({ projectId, userId: memberId, authMethodId: methodId })
        )
      );

      expect(results.filter(Boolean)).toHaveLength(MAX_REQUESTS);
      expect((await resetRow())?.requestCount).toBe(MAX_REQUESTS);
      // The stored digest is the digest of one of the issued tokens (the last to commit).
      const issued = results.filter(Boolean).map((r) => sha256(r!.token));
      expect(issued).toContain((await resetRow())?.tokenHash);
    });

    it('answers the same and sends nothing once the budget is spent, and keeps the live link', async () => {
      for (let i = 0; i < MAX_REQUESTS; i += 1) await request();
      expect(sent).toHaveLength(MAX_REQUESTS);
      const live = tokenOf(sent.at(-1)!.resetUrl);

      await expect(request()).resolves.toBeUndefined();

      expect(sent).toHaveLength(MAX_REQUESTS);
      expect((await resetRow())?.tokenHash).toBe(sha256(live));
    });

    it('budgets per address: another member of the same project is not affected', async () => {
      await db
        .insert(userAuthenticationMethods)
        .values({
          userId: otherUserId,
          provider: 'email',
          providerId: `other-${tag}@example.com`,
          providerData: {},
          isVerified: true,
        })
        .onConflictDoNothing();
      for (let i = 0; i < MAX_REQUESTS; i += 1) await request();

      await request(`other-${tag}@example.com`);

      expect(sent.at(-1)!.to).toBe(`other-${tag}@example.com`);
      expect(sent).toHaveLength(MAX_REQUESTS + 1);
      await db.delete(projectPasswordResets).where(eq(projectPasswordResets.userId, otherUserId));
    });

    it('starts a new window after the old one lapses', async () => {
      for (let i = 0; i < MAX_REQUESTS; i += 1) await request();
      await request();
      expect(sent).toHaveLength(MAX_REQUESTS);

      clock = new Date(clock.getTime() + WINDOW_MS + 1000);
      await request();

      expect(sent).toHaveLength(MAX_REQUESTS + 1);
      expect((await resetRow())?.requestCount).toBe(1);
    });
  });

  describe('completion', () => {
    it("writes the credential, clears the lockout, verifies the mailbox and revokes this project's grants, in one go", async () => {
      const { services } = wiring(db);
      await services.credentials.setPassword({
        scope: { scope: 'project', projectId },
        userId: memberId,
        password: OLD_PASSWORD,
        source: 'cdm-import',
      });
      // Platform credential and a lockout in each project.
      await db.insert(userCredentials).values({
        userId: memberId,
        hash: '$2b$04$platformhashplatformhashpOwDBhash1234567890123456789',
        source: 'register',
      });
      const platformBefore = (
        await db
          .select({
            hash: userCredentials.hash,
            source: userCredentials.source,
            updatedAt: userCredentials.updatedAt,
          })
          .from(userCredentials)
          .where(eq(userCredentials.userId, memberId))
      )[0];
      for (const pid of [projectId, otherProjectId]) {
        for (let i = 0; i < 6; i += 1) {
          await services.credentialLockouts.recordFailure(
            { scope: 'project', projectId: pid },
            memberId
          );
        }
      }
      // Grants: two apps and a retired app in this project, one in the other project,
      // another member's grant, and one already revoked.
      const mine = [
        await seedGrant(memberId, appId),
        await seedGrant(memberId, secondAppId),
        await seedGrant(memberId, retiredAppId),
      ];
      const otherProjectGrant = await seedGrant(memberId, otherProjectAppId);
      const otherMemberGrant = await seedGrant(otherUserId, appId);
      const alreadyRevoked = await seedGrant(memberId, appId, true);
      const alreadyRevokedAt = (
        await db
          .select({ deletedAt: projectOAuthGrants.deletedAt })
          .from(projectOAuthGrants)
          .where(eq(projectOAuthGrants.id, alreadyRevoked))
      )[0].deletedAt;
      const token = await requestedToken();

      await complete(token);

      expect(await credentialRow()).toMatchObject({ source: 'reset' });
      expect(
        await services.credentials.verifyPassword({
          scope: { scope: 'project', projectId },
          userId: memberId,
          password: NEW_PASSWORD,
        })
      ).toBe(true);
      expect(
        await services.credentials.verifyPassword({
          scope: { scope: 'project', projectId },
          userId: memberId,
          password: OLD_PASSWORD,
        })
      ).toBe(false);

      // Lockout: this project's cleared, the other's untouched.
      const lockouts = await db
        .select({
          projectId: projectUserCredentialLockouts.projectId,
          failedAttempts: projectUserCredentialLockouts.failedAttempts,
        })
        .from(projectUserCredentialLockouts)
        .where(eq(projectUserCredentialLockouts.userId, memberId));
      expect(lockouts.map((row) => row.projectId)).toEqual([otherProjectId]);

      // The mailbox is proven.
      const [method] = await db
        .select({ isVerified: userAuthenticationMethods.isVerified })
        .from(userAuthenticationMethods)
        .where(eq(userAuthenticationMethods.id, methodId));
      expect(method.isVerified).toBe(true);

      // Every grant of the member in this project's apps went, soft-deleted apps included.
      for (const id of mine) expect(await grantDeleted(id)).toBe(true);
      // Nothing outside this (project, user).
      expect(await grantDeleted(otherProjectGrant)).toBe(false);
      expect(await grantDeleted(otherMemberGrant)).toBe(false);
      // An already revoked grant keeps its original revocation time.
      expect(
        (
          await db
            .select({ deletedAt: projectOAuthGrants.deletedAt })
            .from(projectOAuthGrants)
            .where(eq(projectOAuthGrants.id, alreadyRevoked))
        )[0].deletedAt
      ).toEqual(alreadyRevokedAt);

      // The platform credential was not read or written.
      expect(
        (
          await db
            .select({
              hash: userCredentials.hash,
              source: userCredentials.source,
              updatedAt: userCredentials.updatedAt,
            })
            .from(userCredentials)
            .where(eq(userCredentials.userId, memberId))
        )[0]
      ).toEqual(platformBefore);

      // And the token is spent.
      expect((await resetRow())?.tokenHash).toBeNull();
      expect((await resetRow())?.consumedAt).not.toBeNull();
      await expect(complete(token, 'An0ther-Passw0rd!')).rejects.toThrow(
        'Invalid or expired password reset link'
      );
    });

    it('is single-use under concurrency: exactly one of many simultaneous completions wins', async () => {
      const token = await requestedToken();

      const outcomes = await Promise.allSettled(
        Array.from({ length: 8 }, (_, i) => complete(token, `Zq7!mKp2#vX${i}`))
      );

      expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
      for (const outcome of outcomes.filter((o) => o.status === 'rejected')) {
        expect((outcome as PromiseRejectedResult).reason.message).toBe(
          'Invalid or expired password reset link'
        );
      }
      expect(await credentialRow()).toMatchObject({ source: 'reset' });
    });

    it('refuses an expired token and keeps nothing', async () => {
      const token = await requestedToken();
      clock = new Date(clock.getTime() + TTL_MS + 1000);

      await expect(complete(token)).rejects.toThrow('Invalid or expired password reset link');

      expect(await credentialRow()).toBeNull();
    });

    it('rolls the whole completion back, token included, when a later step fails', async () => {
      const { services } = wiring(db);
      await services.credentials.setPassword({
        scope: { scope: 'project', projectId },
        userId: memberId,
        password: OLD_PASSWORD,
        source: 'cdm-import',
      });
      const before = await credentialRow();
      for (let i = 0; i < 3; i += 1) {
        await services.credentialLockouts.recordFailure({ scope: 'project', projectId }, memberId);
      }
      const grant = await seedGrant(memberId, appId);
      const token = await requestedToken();

      // A failure in the last step: the grants update.
      await expect(
        db.transaction(async (tx) => {
          const w = wiring(tx as never);
          vi.spyOn(w.services.projectOAuthGrants, 'revokeAllForUserInProject').mockRejectedValue(
            new Error('boom')
          );
          const handler = new ProjectPasswordResetHandler(
            w.services.projectApps,
            w.services.projectUsers,
            w.services.userAuthenticationMethods,
            w.services.credentials,
            w.services.credentialLockouts,
            w.resets,
            w.services.projectOAuthGrants,
            email_ as never,
            cache as never,
            new DrizzleTransactionalConnection(tx as never)
          );
          return handler.completeReset({
            clientId: clientId(),
            redirectUri: REDIRECT_URI,
            token,
            password: NEW_PASSWORD,
          });
        })
      ).rejects.toThrow('boom');

      expect(await credentialRow()).toEqual(before);
      expect((await resetRow())?.tokenHash).toBe(sha256(token));
      expect(await grantDeleted(grant)).toBe(false);
      const [{ failedAttempts }] = await db
        .select({ failedAttempts: projectUserCredentialLockouts.failedAttempts })
        .from(projectUserCredentialLockouts)
        .where(eq(projectUserCredentialLockouts.userId, memberId));
      expect(failedAttempts).toBe(3);
      const [method] = await db
        .select({ isVerified: userAuthenticationMethods.isVerified })
        .from(userAuthenticationMethods)
        .where(eq(userAuthenticationMethods.id, methodId));
      expect(method.isVerified).toBe(false);

      // The link is still good.
      await complete(token);
      expect(await credentialRow()).toMatchObject({ source: 'reset' });
    });

    it('does not use the token up when the password is refused by the policy', async () => {
      const token = await requestedToken();

      await expect(complete(token, 'weak')).rejects.toThrow();

      expect((await resetRow())?.tokenHash).toBe(sha256(token));
      await complete(token);
      expect(await credentialRow()).toMatchObject({ source: 'reset' });
    });

    it('refuses, and writes nothing, for a member removed after the link was requested', async () => {
      const token = await requestedToken();
      await db
        .update(projectUsers)
        .set({ deletedAt: new Date() })
        .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, memberId)));

      await expect(complete(token)).rejects.toThrow('Invalid or expired password reset link');

      expect(await credentialRow()).toBeNull();
    });

    it('stores source "reset", the one value a later import never replaces (only "cdm-import" is replaceable)', async () => {
      const { services } = wiring(db);
      await services.credentials.setPassword({
        scope: { scope: 'project', projectId },
        userId: memberId,
        password: OLD_PASSWORD,
        source: 'cdm-import',
      });
      expect((await credentialRow())?.source).toBe('cdm-import');

      await complete(await requestedToken());

      expect((await credentialRow())?.source).toBe('reset');
      expect((await credentialRow())?.source).not.toBe('cdm-import');
    });
  });

  describe('bulk revoke of grants (repository)', () => {
    it("revokes only the live grants of that user across that project's apps, and returns their ids", async () => {
      const { services } = wiring(db);
      const mine = [await seedGrant(memberId, appId), await seedGrant(memberId, secondAppId)];
      const untouched = [
        await seedGrant(memberId, otherProjectAppId),
        await seedGrant(otherUserId, appId),
      ];

      const revoked = await services.projectOAuthGrants.revokeAllForUserInProject(
        projectId,
        memberId
      );

      expect(revoked).toBe(2);
      for (const id of mine) expect(await grantDeleted(id)).toBe(true);
      for (const id of untouched) expect(await grantDeleted(id)).toBe(false);
      expect(await services.projectOAuthGrants.revokeAllForUserInProject(projectId, memberId)).toBe(
        0
      );
    });

    it('does nothing for a user with no grants in the project', async () => {
      const { services } = wiring(db);

      expect(
        await services.projectOAuthGrants.revokeAllForUserInProject(projectId, strangerId)
      ).toBe(0);
    });
  });

  describe('row-level security', () => {
    it("shows a project's reset rows only to that project's tenant role", async () => {
      await requestedToken();

      const visibleFrom = (project: string) =>
        db.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL ROLE grant_app_restricted`);
          await tx.execute(sql`SELECT set_config('app.current_project_id', ${project}, true)`);
          const rows = await tx
            .select({ id: projectPasswordResets.id })
            .from(projectPasswordResets)
            .where(eq(projectPasswordResets.userId, memberId));
          return rows.length;
        });

      expect(await visibleFrom(projectId)).toBe(1);
      expect(await visibleFrom(otherProjectId)).toBe(0);
    });
  });
});
