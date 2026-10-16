/**
 * Platform password cut-over against a real PostgreSQL (ADR 0011 slice 2): what only the
 * database can show.
 *
 * - the restricted RLS role (migration 0042, used for every scoped request) has no
 *   privileges on the platform credential tables since migration 0088, and keeps them on the
 *   project table;
 * - a console change-password from a scoped request still works, because the credential
 *   service runs the platform operation on the base connection, not in the request
 *   transaction (and two concurrent changes cannot both pass the current-password check);
 * - an unscoped transaction is joined, so registration's credential rolls back with its user;
 * - migration 0087 carries Grant-set and verified-import hashes verbatim (so those passwords
 *   still log in), drops unverified imports, and is idempotent.
 *
 * Runs only when `GRANT_TEST_DATABASE_URL` points at a database with every migration applied
 * (`pnpm --filter @grantjs/database db:migrate`) and a login role that is a member of the RLS
 * restricted role. Without the variable the whole file is skipped, so `pnpm test` stays
 * database-free. It writes its own rows and removes them.
 *
 *   GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
 *     pnpm --filter grant-api exec vitest run tests/integration/platform-credentials.postgres.integration.test.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GrantAuth } from '@grantjs/core';
import {
  projects,
  projectUserCredentials,
  schema,
  userAuthenticationMethods,
  userCredentials,
  users,
} from '@grantjs/database';
import { eq, inArray, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setRlsContext } from '@/lib/rls';
import { hashToken } from '@/lib/token.lib';
import { createRepositories } from '@/repositories';
import { createServices } from '@/services';

const url = process.env.GRANT_TEST_DATABASE_URL;

const migrationSql = (name: string) =>
  readFileSync(
    resolve(__dirname, '../../../../packages/@grantjs/database/src/migrations', name),
    'utf8'
  );

/** `bcrypt.GenerateFromPassword("Legacy-Passw0rd!", DefaultCost)` from Go's x/crypto. */
const GO_PASSWORD = 'Legacy-Passw0rd!';
const GO_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';

const PASSWORD = 'Correct-Horse-7-Staple!';
const NEW_PASSWORD = 'Brand-New-Passw0rd!';
const PLATFORM = { scope: 'platform' } as const;

describe.skipIf(!url)('platform credential cut-over on PostgreSQL', () => {
  const notices: string[] = [];
  const client = postgres(url ?? 'postgres://unused', {
    max: 10,
    onnotice: (notice) => {
      notices.push(String(notice.message));
    },
  });
  const db = drizzle(client, { schema });
  const tag = Date.now().toString(36);
  const cleanupUsers: string[] = [];
  let projectId: string;

  async function createUser(name: string, options: { deleted?: boolean } = {}): Promise<string> {
    const [row] = await db
      .insert(users)
      .values({ name: `cutover-${tag}-${name}`, deletedAt: options.deleted ? new Date() : null })
      .returning({ id: users.id });
    cleanupUsers.push(row.id);
    return row.id;
  }

  async function createEmailMethod(
    userId: string,
    label: string,
    providerData: Record<string, unknown>,
    options: { verified?: boolean; deleted?: boolean; updatedAt?: Date } = {}
  ) {
    await db.insert(userAuthenticationMethods).values({
      userId,
      provider: 'email',
      providerId: `${label}-${tag}@example.test`,
      providerData,
      isVerified: options.verified ?? true,
      deletedAt: options.deleted ? new Date() : null,
      updatedAt: options.updatedAt ?? new Date(),
    });
  }

  /** The services as a request gets them: scoped transaction for the repositories, pool as `baseDb`. */
  function servicesFor(userId: string, requestTransaction: unknown) {
    const cache = new Proxy({}, { get: () => ({}) });
    return createServices(
      createRepositories(requestTransaction as never),
      { userId } as unknown as GrantAuth,
      requestTransaction as never,
      cache as never,
      {} as never,
      { baseDb: db }
    );
  }

  beforeAll(async () => {
    const [project] = await db
      .insert(projects)
      .values({ name: 'cutover-test', slug: `cutover-test-${tag}` })
      .returning({ id: projects.id });
    projectId = project.id;
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, cleanupUsers));
    await db.delete(projects).where(eq(projects.id, projectId));
    await client.end();
  });

  describe('the restricted role cannot reach platform credentials', () => {
    const asRestricted = async <T>(work: (tx: typeof db) => Promise<T>): Promise<T> =>
      db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE grant_app_restricted`);
        return work(tx as unknown as typeof db);
      });

    it.each(['user_credentials', 'user_credential_lockouts', 'user_credential_audit_logs'])(
      'refuses SELECT and INSERT on %s with a permission error',
      async (table) => {
        const select = asRestricted((tx) =>
          tx.execute(sql.raw(`SELECT count(*) FROM public.${table}`))
        );
        await expect(select).rejects.toMatchObject({ cause: { code: '42501' } });

        const insert = asRestricted((tx) =>
          tx.execute(sql.raw(`INSERT INTO public.${table} DEFAULT VALUES`))
        );
        await expect(insert).rejects.toMatchObject({ cause: { code: '42501' } });
      }
    );

    it('says so in the catalog, and keeps the project credential table for the role', async () => {
      const privileges = await db.execute(sql`
        SELECT
          has_table_privilege('grant_app_restricted', 'public.user_credentials', 'SELECT') AS platform_select,
          has_table_privilege('grant_app_restricted', 'public.user_credentials', 'UPDATE') AS platform_update,
          has_table_privilege('grant_app_restricted', 'public.project_user_credentials', 'SELECT') AS project_select,
          has_table_privilege('grant_app_restricted', 'public.project_user_credentials', 'INSERT') AS project_insert
      `);
      expect(privileges[0]).toEqual({
        platform_select: false,
        platform_update: false,
        project_select: true,
        project_insert: true,
      });

      const userId = await createUser('project-visible');
      await db
        .insert(projectUserCredentials)
        .values({ projectId, userId, hash: GO_HASH, source: 'register' });
      const visible = await asRestricted((tx) =>
        tx.execute(
          sql`SELECT count(*)::int AS n FROM public.project_user_credentials WHERE user_id = ${userId}`
        )
      );
      expect(visible[0]).toEqual({ n: 1 });
    });
  });

  describe('platform credential operations from a scoped request', () => {
    it('lets a console change-password work, atomically, outside the request transaction', async () => {
      const userId = await createUser('change');
      await createEmailMethod(userId, 'change', {});
      await servicesFor(userId, db).credentials.setPassword({
        scope: PLATFORM,
        userId,
        password: PASSWORD,
        source: 'register',
      });

      // The request transaction itself cannot read the credential table (see above); the
      // service never needs it to: a scoped request changes the password.
      await db.transaction(async (tx) => {
        await setRlsContext(tx, { projectId });
        const services = servicesFor(userId, tx);

        expect(
          await services.userAuthenticationMethods.hasPlatformPassword(userId, tx as never)
        ).toBe(true);
        await services.userAuthenticationMethods.changePassword(
          userId,
          PASSWORD,
          NEW_PASSWORD,
          tx as never
        );
      });

      const services = servicesFor(userId, db);
      expect(
        await services.credentials.verifyPassword({
          scope: PLATFORM,
          userId,
          password: NEW_PASSWORD,
        })
      ).toBe(true);
      expect(
        await services.credentials.verifyPassword({ scope: PLATFORM, userId, password: PASSWORD })
      ).toBe(false);
      expect((await services.credentials.getCredential(PLATFORM, userId))?.source).toBe('change');
    });

    it('commits the credential change in its own transaction, whatever becomes of the request', async () => {
      // The documented trade-off: not part of the request transaction.
      const userId = await createUser('own-tx');
      await createEmailMethod(userId, 'own-tx', {});
      await servicesFor(userId, db).credentials.setPassword({
        scope: PLATFORM,
        userId,
        password: PASSWORD,
        source: 'register',
      });

      await expect(
        db.transaction(async (tx) => {
          await setRlsContext(tx, { projectId });
          await servicesFor(userId, tx).userAuthenticationMethods.changePassword(
            userId,
            PASSWORD,
            NEW_PASSWORD,
            tx as never
          );
          throw new Error('request failed afterwards');
        })
      ).rejects.toThrow('request failed afterwards');

      expect(
        await servicesFor(userId, db).credentials.verifyPassword({
          scope: PLATFORM,
          userId,
          password: NEW_PASSWORD,
        })
      ).toBe(true);
    });

    it('refuses a wrong or missing current password and changes nothing', async () => {
      const userId = await createUser('wrong-current');
      await createEmailMethod(userId, 'wrong-current', {});
      const services = servicesFor(userId, db);
      await services.credentials.setPassword({
        scope: PLATFORM,
        userId,
        password: PASSWORD,
        source: 'register',
      });

      await db.transaction(async (tx) => {
        await setRlsContext(tx, { projectId });
        const scoped = servicesFor(userId, tx);
        await expect(
          scoped.userAuthenticationMethods.changePassword(
            userId,
            'Wrong-Passw0rd!',
            NEW_PASSWORD,
            tx as never
          )
        ).rejects.toThrow('Current password is incorrect');
        await expect(
          scoped.userAuthenticationMethods.changePassword(
            userId,
            undefined,
            NEW_PASSWORD,
            tx as never
          )
        ).rejects.toThrow('Current password is required');
      });

      expect(
        await services.credentials.verifyPassword({ scope: PLATFORM, userId, password: PASSWORD })
      ).toBe(true);
    });

    it('lets only one of two concurrent changes pass the current-password check', async () => {
      const userId = await createUser('race');
      await createEmailMethod(userId, 'race', {});
      const services = servicesFor(userId, db);
      await services.credentials.setPassword({
        scope: PLATFORM,
        userId,
        password: PASSWORD,
        source: 'register',
      });

      const attempt = (next: string) =>
        services.credentials.changePlatformPassword({
          userId,
          currentPassword: PASSWORD,
          newPassword: next,
        });
      const results = await Promise.allSettled([
        attempt('Alpha-Passw0rd-1!'),
        attempt('Bravo-Passw0rd-2!'),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(String(rejected.reason)).toContain('Current password is incorrect');
    });

    it('resets the platform lockout on a change, leaving the project lockout alone', async () => {
      const userId = await createUser('lockout');
      await createEmailMethod(userId, 'lockout', {});
      const services = servicesFor(userId, db);
      await services.credentials.setPassword({
        scope: PLATFORM,
        userId,
        password: PASSWORD,
        source: 'register',
      });
      const project = { scope: 'project', projectId } as const;
      await services.credentialLockouts.recordFailure(PLATFORM, userId);
      await services.credentialLockouts.recordFailure(project, userId);

      await db.transaction(async (tx) => {
        await setRlsContext(tx, { projectId });
        await servicesFor(userId, tx).userAuthenticationMethods.changePassword(
          userId,
          PASSWORD,
          NEW_PASSWORD,
          tx as never
        );
      });

      expect((await services.credentialLockouts.getStatus(PLATFORM, userId)).failedAttempts).toBe(
        0
      );
      expect((await services.credentialLockouts.getStatus(project, userId)).failedAttempts).toBe(1);
    });

    it('lists platform and every project credential for the export, from a project-scoped request', async () => {
      const userId = await createUser('export');
      const [other] = await db
        .insert(projects)
        .values({ name: 'cutover-other', slug: `cutover-other-${tag}` })
        .returning({ id: projects.id });
      try {
        const services = servicesFor(userId, db);
        await services.credentials.setPassword({
          scope: PLATFORM,
          userId,
          password: PASSWORD,
          source: 'register',
        });
        await services.credentials.setPassword({
          scope: { scope: 'project', projectId },
          userId,
          password: PASSWORD,
          source: 'reset',
        });
        await services.credentials.setPassword({
          scope: { scope: 'project', projectId: other.id },
          userId,
          password: PASSWORD,
          source: 'reset',
        });

        const listed = await db.transaction(async (tx) => {
          await setRlsContext(tx, { projectId });
          return servicesFor(userId, tx).credentials.listForUser(userId, tx as never);
        });

        expect(listed.map((c) => `${c.scope}:${c.projectId ?? '-'}`).sort()).toEqual(
          ['platform:-', `project:${projectId}`, `project:${other.id}`].sort()
        );
        for (const credential of listed) {
          expect(credential).not.toHaveProperty('hash');
        }
      } finally {
        await db.delete(projects).where(eq(projects.id, other.id));
      }
    });
  });

  describe('an unscoped transaction is joined', () => {
    it('rolls the credential back with the caller, so a failed registration leaves none', async () => {
      let userId = '';

      await expect(
        db.transaction(async (tx) => {
          const [row] = await tx
            .insert(users)
            .values({ name: `cutover-${tag}-register` })
            .returning({ id: users.id });
          userId = row.id;
          // The credential row references the user created a moment ago, in this transaction:
          // only a joined write can see it.
          const services = servicesFor(userId, tx);
          await services.credentials.setPassword(
            { scope: PLATFORM, userId, password: PASSWORD, source: 'register' },
            tx as never
          );
          expect(await services.credentials.hasCredential(PLATFORM, userId, tx as never)).toBe(
            true
          );
          throw new Error('registration failed afterwards');
        })
      ).rejects.toThrow('registration failed afterwards');

      expect(
        await db
          .select({ id: userCredentials.id })
          .from(userCredentials)
          .where(eq(userCredentials.userId, userId))
      ).toHaveLength(0);
    });

    it('commits the credential with the caller, and a reset writes source "reset"', async () => {
      const userId = await createUser('reset');
      await createEmailMethod(userId, 'reset', {});
      const token = 'f'.repeat(64);
      await db
        .update(userAuthenticationMethods)
        .set({
          providerData: {
            passwordResetOtp: { tokenHash: hashToken(token), validUntil: Date.now() + 60_000 },
          },
        })
        .where(eq(userAuthenticationMethods.userId, userId));

      await db.transaction(async (tx) => {
        const services = servicesFor(userId, tx);
        await expect(
          services.userAuthenticationMethods.resetPassword(token, NEW_PASSWORD, tx as never)
        ).resolves.toBe(userId);
      });

      const services = servicesFor(userId, db);
      expect((await services.credentials.getCredential(PLATFORM, userId))?.source).toBe('reset');
      expect(
        await services.credentials.verifyPassword({
          scope: PLATFORM,
          userId,
          password: NEW_PASSWORD,
        })
      ).toBe(true);

      // The token is consumed, never stored in plain text, and found by digest only.
      const [method] = await db
        .select({ providerData: userAuthenticationMethods.providerData })
        .from(userAuthenticationMethods)
        .where(eq(userAuthenticationMethods.userId, userId));
      expect(method.providerData).toEqual({});
      await expect(
        db.transaction((tx) =>
          servicesFor(userId, tx).userAuthenticationMethods.resetPassword(
            token,
            PASSWORD,
            tx as never
          )
        )
      ).resolves.toBeNull();
    });
  });

  describe('migration 0087: the platform password cut-over', () => {
    const grantSet = 'grant-set';
    const verifiedImport = 'verified-import';
    const unverifiedImport = 'unverified-import';
    const existing = 'already-has-credential';
    const softDeleted = 'soft-deleted-method';
    const superseded = 'two-methods';
    const resetOnly = 'reset-token-only';
    let ids: Record<string, string>;

    async function runMigration(): Promise<string[]> {
      notices.length = 0;
      await client.unsafe(migrationSql('0087_platform_password_cutover.sql'));
      return notices.filter((n) => n.startsWith('platform password cut-over'));
    }

    it('copies Grant-set and verified-import hashes verbatim, drops unverified imports, strips providerData', async () => {
      const grantSetHash = (await import('@/lib/token.lib')).hashSecret('Grant-Set-Passw0rd!', 4);
      ids = {
        [grantSet]: await createUser(grantSet),
        [verifiedImport]: await createUser(verifiedImport),
        [unverifiedImport]: await createUser(unverifiedImport),
        [existing]: await createUser(existing),
        [softDeleted]: await createUser(softDeleted),
        [superseded]: await createUser(superseded),
        [resetOnly]: await createUser(resetOnly),
      };

      await createEmailMethod(ids[grantSet], grantSet, { hashedPassword: grantSetHash });
      await createEmailMethod(ids[verifiedImport], verifiedImport, {
        hashedPassword: GO_HASH,
        passwordSource: 'cdm-import',
      });
      await createEmailMethod(
        ids[unverifiedImport],
        unverifiedImport,
        { hashedPassword: GO_HASH, passwordSource: 'cdm-import' },
        { verified: false }
      );
      await createEmailMethod(ids[existing], existing, { hashedPassword: GO_HASH });
      await createEmailMethod(
        ids[softDeleted],
        softDeleted,
        { hashedPassword: GO_HASH },
        { deleted: true }
      );
      await createEmailMethod(
        ids[superseded],
        `${superseded}-old`,
        { hashedPassword: grantSetHash },
        { updatedAt: new Date(Date.now() - 86_400_000) }
      );
      await createEmailMethod(ids[superseded], `${superseded}-new`, { hashedPassword: GO_HASH });
      await createEmailMethod(ids[resetOnly], resetOnly, {
        passwordResetOtp: { token: 'plain-text-token', validUntil: Date.now() + 60_000 },
      });
      await db.insert(userCredentials).values({
        userId: ids[existing],
        hash: grantSetHash,
        source: 'register',
      });

      const reported = await runMigration();
      expect(reported.length).toBeGreaterThanOrEqual(9);

      const credentialOf = async (name: string) =>
        (
          await db
            .select({ hash: userCredentials.hash, source: userCredentials.source })
            .from(userCredentials)
            .where(eq(userCredentials.userId, ids[name]))
        )[0];

      expect(await credentialOf(grantSet)).toEqual({ hash: grantSetHash, source: 'migrated' });
      expect(await credentialOf(verifiedImport)).toEqual({
        hash: GO_HASH,
        source: 'migrated-import',
      });
      expect(await credentialOf(unverifiedImport)).toBeUndefined();
      // A credential that already exists is never overwritten.
      expect(await credentialOf(existing)).toEqual({ hash: grantSetHash, source: 'register' });
      expect(await credentialOf(softDeleted)).toBeUndefined();
      // Two Email methods for one user: the most recently updated hash wins.
      expect(await credentialOf(superseded)).toEqual({ hash: GO_HASH, source: 'migrated' });

      // Nothing secret, no marker and no plain-text token is left in providerData.
      const leftovers = await db
        .select({
          providerId: userAuthenticationMethods.providerId,
          providerData: userAuthenticationMethods.providerData,
        })
        .from(userAuthenticationMethods)
        .where(like(userAuthenticationMethods.providerId, `%-${tag}@example.test`));
      expect(leftovers.length).toBeGreaterThanOrEqual(8);
      for (const row of leftovers) {
        const text = JSON.stringify(row.providerData);
        expect(text).not.toContain('hashedPassword');
        expect(text).not.toContain('passwordSource');
        expect(text).not.toContain('passwordResetOtp');
        expect(text).not.toContain('$2');
      }
    });

    it('keeps migrated passwords working with no reset: the same hash verifies through the service', async () => {
      const services = servicesFor(ids[grantSet], db);
      expect(
        await services.credentials.verifyPassword({
          scope: PLATFORM,
          userId: ids[grantSet],
          password: 'Grant-Set-Passw0rd!',
        })
      ).toBe(true);
      // The Go-generated $2a$10$ hash of a verified import opens with the original plaintext.
      expect(
        await services.credentials.verifyPassword({
          scope: PLATFORM,
          userId: ids[verifiedImport],
          password: GO_PASSWORD,
        })
      ).toBe(true);
      expect(
        await services.credentials.verifyPassword({
          scope: PLATFORM,
          userId: ids[verifiedImport],
          password: `${GO_PASSWORD}x`,
        })
      ).toBe(false);
      // The dropped hash opens nothing, and says so the same way as a wrong password.
      expect(
        await services.credentials.verifyPassword({
          scope: PLATFORM,
          userId: ids[unverifiedImport],
          password: GO_PASSWORD,
        })
      ).toBe(false);
      expect(await services.userAuthenticationMethods.hasPlatformPassword(ids[grantSet])).toBe(
        true
      );
      expect(
        await services.userAuthenticationMethods.hasPlatformPassword(ids[unverifiedImport])
      ).toBe(false);
    });

    it('is idempotent: a second run copies and strips nothing', async () => {
      const before = await db
        .select({ id: userCredentials.id, hash: userCredentials.hash })
        .from(userCredentials)
        .where(inArray(userCredentials.userId, Object.values(ids)));

      const reported = await runMigration();

      const after = await db
        .select({ id: userCredentials.id, hash: userCredentials.hash })
        .from(userCredentials)
        .where(inArray(userCredentials.userId, Object.values(ids)));
      expect(after.map((r) => r.id).sort()).toEqual(before.map((r) => r.id).sort());
      expect(reported).toContain(
        'platform password cut-over: email methods with a hash scanned: 0'
      );
      expect(reported).toContain('platform password cut-over: copied as migrated: 0');
      expect(reported).toContain('platform password cut-over: provider_data rows rewritten: 0');
    });
  });
});
