/**
 * `bootstrapDatabase` + the real RLS grant, with only the outside world mocked.
 *
 * Models the AWS serverless target: `DB_URL` is held by a secret resolver, so the
 * parsed env has none and the `POSTGRES_*` defaults point at localhost. The grant must
 * use the URL the caller passes in, not those defaults.
 */
import type { Env } from '@grantjs/env';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const unsafe = vi.fn<(sql: string) => Promise<unknown>>();
const end = vi.fn<(opts?: unknown) => Promise<void>>();
const postgresFactory = vi.fn(() => ({ unsafe, end }));

vi.mock('postgres', () => ({ default: (...args: unknown[]) => postgresFactory(...(args as [])) }));
vi.mock('drizzle-orm/postgres-js/migrator', () => ({ migrate: vi.fn(async () => undefined) }));
vi.mock('./scripts/seed-permissions', () => ({ seedAll: vi.fn(async () => ({})) }));
vi.mock('./seed-core', () => ({ ensureSystemUserAndSigningKey: vi.fn(async () => undefined) }));
vi.mock('./with-session-advisory-lock.lib', () => ({
  withSessionAdvisoryLock: async (_db: unknown, _name: string, work: () => Promise<void>) => work(),
}));

const getEnvMock = vi.fn<() => Env>();
vi.mock('@grantjs/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@grantjs/env')>();
  return { ...actual, getEnv: () => getEnvMock() };
});

const { bootstrapDatabase } = await import('./bootstrap');

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const RESOLVED_URL = 'postgresql://resolved_user:pw@db.example:5432/grant_db';

function env(overrides: Partial<Env> = {}): Env {
  return {
    DB_URL: '',
    DB_GRANT_ROLE_URL: '',
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: 5432,
    POSTGRES_USER: 'grant_user',
    POSTGRES_PASSWORD: 'grant_password',
    POSTGRES_DB: 'grant_db',
    SECURITY_RLS_ROLE: 'grant_app_restricted',
    ...overrides,
  } as unknown as Env;
}

type Db = Parameters<typeof bootstrapDatabase>[0];
const db = { transaction: async (cb: (tx: unknown) => Promise<void>) => cb({}) } as unknown as Db;

beforeEach(() => {
  vi.clearAllMocks();
  unsafe.mockResolvedValue(undefined);
  end.mockResolvedValue(undefined);
  getEnvMock.mockReturnValue(env());
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('bootstrapDatabase RLS grant with a resolver-provided URL', () => {
  it('connects with the passed URL and grants to its login user when DB_URL is not in the env', async () => {
    await bootstrapDatabase(db, SYSTEM_USER_ID, { databaseUrl: RESOLVED_URL });

    expect(postgresFactory).toHaveBeenCalledExactlyOnceWith(RESOLVED_URL, { max: 1 });
    expect(unsafe).toHaveBeenCalledExactlyOnceWith(
      'GRANT "grant_app_restricted" TO "resolved_user"'
    );
  });

  it('keeps DB_GRANT_ROLE_URL as the connection, with the passed URL still naming the grantee', async () => {
    getEnvMock.mockReturnValue(
      env({ DB_GRANT_ROLE_URL: 'postgresql://super:pw@db:5432/grant_db' })
    );

    await bootstrapDatabase(db, SYSTEM_USER_ID, { databaseUrl: RESOLVED_URL });

    expect(postgresFactory).toHaveBeenCalledWith('postgresql://super:pw@db:5432/grant_db', {
      max: 1,
    });
    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "resolved_user"');
  });

  it('without a passed URL, still falls back to the ambient env (unchanged behaviour)', async () => {
    getEnvMock.mockReturnValue(env({ DB_URL: 'postgresql://env_user:pw@db:5432/grant_db' }));

    await bootstrapDatabase(db, SYSTEM_USER_ID);

    expect(postgresFactory).toHaveBeenCalledWith('postgresql://env_user:pw@db:5432/grant_db', {
      max: 1,
    });
    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "env_user"');
  });

  it('never writes the URL or its password to stdout or stderr', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    unsafe.mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: '42501' }));

    await expect(
      bootstrapDatabase(db, SYSTEM_USER_ID, { databaseUrl: RESOLVED_URL })
    ).rejects.toThrow('permission denied');

    const out = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
    expect(out).not.toContain('db.example');
    expect(out).not.toContain(':pw@');
  });
});
