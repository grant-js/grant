/**
 * The project-app password lockout against a real PostgreSQL (ADR 0011 slice 4): the count
 * must survive a failing request.
 *
 * Each "request" below is a database transaction around a sign-in, exactly as a scoped
 * request is, built the way the context middleware builds it: services over the request's
 * transaction, plus `durableDb` (the pool) for the sign-in lockout. A failed sign-in throws,
 * so the transaction rolls back; the lockout row written by that request must still be
 * there afterwards. The contrast case shows the same write on the request-bound lockout
 * service is lost, which is why the sign-in is not given that one.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration
 * applied (see `credentials.postgres.integration.test.ts`); skipped otherwise. It writes
 * its own rows and removes them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/project-password.postgres.integration.test.ts
 */
import {
  projects,
  projectUserCredentialLockouts,
  projectUserCredentials,
  schema,
  users,
} from '@grantjs/database';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_OAUTH_STATE_KEY_PREFIX } from '@/constants/cache.constants';

const url = process.env.GRANT_TEST_DATABASE_URL;

const verifySecretSpy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return {
    ...actual,
    hashSecret: (value: string) => actual.hashSecret(value, 4),
    verifySecret: (value: string, hash: string) => {
      verifySecretSpy(value, hash);
      return actual.verifySecret(value, hash);
    },
  };
});

const { ProjectOAuthHandler } = await import('@/handlers/project-oauth.handler');
const { createRepositories } = await import('@/repositories');
const { createServices } = await import('@/services');
const { config } = await import('@/config');

const PASSWORD = 'correct horse battery staple';
const REDIRECT_URI = 'https://example.com/callback';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe.skipIf(!url)('project password lockout on PostgreSQL', () => {
  // Each overlapping request below holds one connection for its transaction and takes a
  // second from the pool for the durable lockout write, so the pool is sized for that.
  const client = postgres(url ?? 'postgres://unused', { max: 40, onnotice: () => {} });
  const db = drizzle(client, { schema });

  let userId: string;
  let projectId: string;
  const cacheStore = new Map<string, unknown>();
  const cache = {
    oauth: {
      set: async (key: string, value: unknown) => void cacheStore.set(key, structuredClone(value)),
      get: async (key: string) => cacheStore.get(key) ?? null,
      delete: async (key: string) => void cacheStore.delete(key),
    },
  };

  const maxAttempts = config.auth.maxFailedLoginAttempts;

  beforeAll(async () => {
    const tag = Date.now().toString(36);
    const [user] = await db
      .insert(users)
      .values({ name: `pw-lockout-${tag}` })
      .returning({ id: users.id });
    userId = user.id;
    const [project] = await db
      .insert(projects)
      .values({ name: 'pw-lockout', slug: `pw-lockout-${tag}` })
      .returning({ id: projects.id });
    projectId = project.id;
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, [userId]));
    await db.delete(projects).where(inArray(projects.id, [projectId]));
    await client.end();
  });

  beforeEach(async () => {
    verifySecretSpy.mockClear();
    cacheStore.clear();
    await db
      .delete(projectUserCredentialLockouts)
      .where(eq(projectUserCredentialLockouts.userId, userId));
    await db.delete(projectUserCredentials).where(eq(projectUserCredentials.userId, userId));
    cacheStore.set(`${PROJECT_OAUTH_STATE_KEY_PREFIX}state-1`, {
      projectAppId: 'app-id',
      redirectUri: REDIRECT_URI,
      clientState: 'client-state',
      provider: 'password',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
    });
  });

  const lockoutRow = async () =>
    (
      await db
        .select({
          failedAttempts: projectUserCredentialLockouts.failedAttempts,
          lockedUntil: projectUserCredentialLockouts.lockedUntil,
        })
        .from(projectUserCredentialLockouts)
        .where(eq(projectUserCredentialLockouts.userId, userId))
    )[0] ?? null;

  /** The handler as one HTTP request builds it: services over a transaction + the pool. */
  function handlerOver(tx: typeof db) {
    const services = createServices(
      createRepositories(tx as never),
      // The actor the audit rows name (a real user, for the audit table's foreign key).
      { userId } as never,
      tx as never,
      {} as never,
      {} as never,
      {
        durableDb: db as never,
      }
    );
    const app = {
      id: 'app-id',
      clientId: 'client-uuid',
      projectId,
      redirectUris: [REDIRECT_URI],
      enabledProviders: ['password'],
      scopes: null,
      name: 'Test App',
    };
    const handler = new ProjectOAuthHandler(
      { getProjectAppByClientId: async () => app, getProjectAppById: async () => app } as never,
      { getProjects: async () => ({ projects: [], totalCount: 0 }) } as never,
      { getScopeSlugLabelsForProject: async () => [] } as never,
      {
        getProjectUsers: async () => [{ userId, projectId }],
        syncProjectUserSearchDocument: async () => undefined,
      } as never,
      {} as never,
      { getAccountProject: async () => Promise.reject(new Error('not account')) } as never,
      { getOrganizationProject: async () => ({ organizationId: 'org-1' }) } as never,
      {} as never,
      { getOrganizationUsers: async () => [{ userId, roleId: 'r' }] } as never,
      {} as never,
      { isConfigured: async () => false } as never,
      { isConfigured: async () => false } as never,
      { listByProject: async () => [], getDecryptedCredentials: async () => null } as never,
      { getGrantedScopeSlugs: async () => [] } as never,
      cache as never,
      {} as never,
      { getUsers: async () => ({ users: [], totalCount: 0 }) } as never,
      {
        getUserAuthenticationMethodByProvider: async (_p: string, id: string) =>
          id === 'member@example.com' ? { userId } : null,
      } as never,
      { addUserIdToScopeCache: async () => undefined } as never,
      {} as never,
      services.credentials,
      services.credentialSignInLockouts,
      services.userMfa
    );
    return { handler, services };
  }

  /** One failing-or-not request: its transaction rolls back when the sign-in throws. */
  async function requestSignIn(password: string) {
    return db.transaction(async (tx) => {
      const { handler } = handlerOver(tx as never);
      return handler.signInWithProjectPassword({
        clientId: 'client-uuid',
        redirectUri: REDIRECT_URI,
        stateId: 'state-1',
        email: 'member@example.com',
        password,
      });
    });
  }

  async function seedCredential() {
    const { services } = handlerOver(db as never);
    await services.credentials.setPassword({
      scope: { scope: 'project', projectId },
      userId,
      password: PASSWORD,
      source: 'cdm-import',
    });
  }

  it('keeps the failure count of a request whose transaction rolled back', async () => {
    await seedCredential();

    await expect(requestSignIn('wrong-0')).rejects.toThrow('Invalid credentials');

    expect(await lockoutRow()).toMatchObject({ failedAttempts: 1 });
  });

  it('would lose that count on the request-bound lockout service (why sign-in is not given it)', async () => {
    await expect(
      db.transaction(async (tx) => {
        const { services } = handlerOver(tx as never);
        await services.credentialLockouts.recordFailure({ scope: 'project', projectId }, userId);
        throw new Error('the request fails');
      })
    ).rejects.toThrow('the request fails');

    expect(await lockoutRow()).toBeNull();
  });

  it('locks after N failures across separate failing requests, then recovers', async () => {
    await seedCredential();
    for (let i = 0; i < maxAttempts; i += 1) {
      await expect(requestSignIn(`wrong-${i}`)).rejects.toThrow('Invalid credentials');
    }
    const locked = await lockoutRow();
    expect(locked?.failedAttempts).toBe(maxAttempts);
    expect(locked?.lockedUntil).not.toBeNull();

    // The right password is refused while locked, and is not even compared to the hash.
    verifySecretSpy.mockClear();
    await expect(requestSignIn(PASSWORD)).rejects.toThrow('Invalid credentials');
    const [{ hash }] = await db
      .select({ hash: projectUserCredentials.hash })
      .from(projectUserCredentials)
      .where(eq(projectUserCredentials.userId, userId));
    expect(verifySecretSpy.mock.calls.filter(([, h]) => h === hash)).toHaveLength(0);

    // After the lock duration (time moved in the row), the right password signs in
    // and clears the count.
    await db
      .update(projectUserCredentialLockouts)
      .set({ lockedUntil: sql`now() - interval '1 minute'` })
      .where(eq(projectUserCredentialLockouts.userId, userId));
    await expect(requestSignIn(PASSWORD)).resolves.toMatchObject({ status: 'authenticated' });
    expect(await lockoutRow()).toBeNull();
  });

  it('lets the Nth attempt succeed after N-1 failures', async () => {
    await seedCredential();
    for (let i = 0; i < maxAttempts - 1; i += 1) {
      await expect(requestSignIn(`wrong-${i}`)).rejects.toThrow('Invalid credentials');
    }
    await expect(requestSignIn(PASSWORD)).resolves.toMatchObject({ status: 'authenticated' });
    expect(await lockoutRow()).toBeNull();
  });

  it('bounds overlapping guesses to the budget (atomic count, recorded before the compare)', async () => {
    await seedCredential();
    const [{ hash }] = await db
      .select({ hash: projectUserCredentials.hash })
      .from(projectUserCredentials)
      .where(eq(projectUserCredentials.userId, userId));
    verifySecretSpy.mockClear();

    const results = await Promise.allSettled(
      Array.from({ length: 15 }, (_, i) => requestSignIn(`guess-${i}`))
    );

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    const againstHash = verifySecretSpy.mock.calls.filter(([, h]) => h === hash);
    expect(againstHash.length).toBeLessThanOrEqual(maxAttempts);
    expect((await lockoutRow())?.failedAttempts).toBe(15);
  });
});
