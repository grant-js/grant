/**
 * Characterization tests for the RLS login-role grant.
 *
 * These assert what the code does *today* — including behaviour that may be
 * surprising. They are deliberately DB-free: `postgres` is mocked, so the SQL
 * text and the connection URL are observable without a live server.
 */
import type { Env } from '@grantjs/env';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const unsafe = vi.fn<(sql: string) => Promise<unknown>>();
const end = vi.fn<(opts?: unknown) => Promise<void>>();
const postgresFactory = vi.fn(() => ({ unsafe, end }));

vi.mock('postgres', () => ({ default: (...args: unknown[]) => postgresFactory(...(args as [])) }));

const getEnvMock = vi.fn<() => Env>();
vi.mock('@grantjs/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@grantjs/env')>();
  return { ...actual, getEnv: () => getEnvMock() };
});

const { ensureRlsRestrictedRoleMembership } = await import('./grant-rls-login-role.lib');

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

beforeEach(() => {
  vi.clearAllMocks();
  unsafe.mockResolvedValue(undefined);
  end.mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ensureRlsRestrictedRoleMembership — SQL emitted', () => {
  it('grants the configured role to the POSTGRES_USER login when DB_URL is unset', async () => {
    await ensureRlsRestrictedRoleMembership({ env: env() });

    expect(unsafe).toHaveBeenCalledExactlyOnceWith('GRANT "grant_app_restricted" TO "grant_user"');
  });

  it('takes the login user from DB_URL when present, not from POSTGRES_USER', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({ DB_URL: 'postgresql://url_user:pw@db:5432/grant_db', POSTGRES_USER: 'ignored' }),
    });

    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "url_user"');
  });

  it('percent-decodes the login user taken from DB_URL', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({ DB_URL: 'postgresql://grant%5Fuser:pw@db:5432/grant_db' }),
    });

    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "grant_user"');
  });

  it('honours a custom SECURITY_RLS_ROLE', async () => {
    await ensureRlsRestrictedRoleMembership({ env: env({ SECURITY_RLS_ROLE: 'tenant_rls' }) });

    expect(unsafe).toHaveBeenCalledWith('GRANT "tenant_rls" TO "grant_user"');
  });

  it('falls back to grant_app_restricted when SECURITY_RLS_ROLE is empty', async () => {
    await ensureRlsRestrictedRoleMembership({ env: env({ SECURITY_RLS_ROLE: '' }) });

    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "grant_user"');
  });
});

describe('ensureRlsRestrictedRoleMembership — connection selection', () => {
  it('derives the URL from POSTGRES_* when neither DB_GRANT_ROLE_URL nor DB_URL is set', async () => {
    await ensureRlsRestrictedRoleMembership({ env: env() });

    expect(postgresFactory).toHaveBeenCalledWith(
      'postgresql://grant_user:grant_password@localhost:5432/grant_db',
      { max: 1 }
    );
  });

  it('prefers DB_GRANT_ROLE_URL over DB_URL for the connection', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({
        DB_URL: 'postgresql://app:pw@db:5432/grant_db',
        DB_GRANT_ROLE_URL: 'postgresql://super:pw@db:5432/grant_db',
      }),
    });

    expect(postgresFactory).toHaveBeenCalledWith('postgresql://super:pw@db:5432/grant_db', {
      max: 1,
    });
  });

  it('CHARACTERIZATION: the elevated connection user is never the grantee — the grantee is always derived from DB_URL/POSTGRES_USER', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({
        DB_URL: 'postgresql://app_user:pw@db:5432/grant_db',
        DB_GRANT_ROLE_URL: 'postgresql://postgres:pw@db:5432/grant_db',
      }),
    });

    expect(postgresFactory).toHaveBeenCalledWith('postgresql://postgres:pw@db:5432/grant_db', {
      max: 1,
    });
    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "app_user"');
  });

  it('trims DB_GRANT_ROLE_URL before using it, and ignores a whitespace-only value', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({ DB_GRANT_ROLE_URL: '   ', DB_URL: 'postgresql://a:b@h:1/d' }),
    });

    expect(postgresFactory).toHaveBeenCalledWith('postgresql://a:b@h:1/d', { max: 1 });
  });

  it('closes the client with a 5s timeout on success', async () => {
    await ensureRlsRestrictedRoleMembership({ env: env() });

    expect(end).toHaveBeenCalledExactlyOnceWith({ timeout: 5 });
  });

  it('falls back to getEnv() when no env is injected', async () => {
    getEnvMock.mockReturnValue(env({ SECURITY_RLS_ROLE: 'from_get_env' }));

    await ensureRlsRestrictedRoleMembership();

    expect(getEnvMock).toHaveBeenCalled();
    expect(unsafe).toHaveBeenCalledWith('GRANT "from_get_env" TO "grant_user"');
  });
});

describe('ensureRlsRestrictedRoleMembership — identifier validation', () => {
  const invalidRoles = [
    ['starts with a digit', '1role'],
    ['contains a hyphen', 'grant-app'],
    ['contains a quote', 'ro"le'],
    ['contains a semicolon', 'role; DROP TABLE users'],
    ['contains a space', 'my role'],
    ['is 64 characters', 'a'.repeat(64)],
  ] as const;

  it.each(invalidRoles)('rejects SECURITY_RLS_ROLE that %s', async (_label, role) => {
    await expect(
      ensureRlsRestrictedRoleMembership({ env: env({ SECURITY_RLS_ROLE: role }) })
    ).rejects.toThrow(/SECURITY_RLS_ROLE must be a valid PostgreSQL identifier/);

    expect(postgresFactory).not.toHaveBeenCalled();
  });

  it('accepts a 63-character role (the PostgreSQL NAMEDATALEN limit)', async () => {
    const role = 'a'.repeat(63);

    await ensureRlsRestrictedRoleMembership({ env: env({ SECURITY_RLS_ROLE: role }) });

    expect(unsafe).toHaveBeenCalledWith(`GRANT "${role}" TO "grant_user"`);
  });

  it('rejects an invalid login user derived from DB_URL, naming the login-user setting', async () => {
    await expect(
      ensureRlsRestrictedRoleMembership({
        env: env({ DB_URL: 'postgresql://bad-user:pw@db:5432/grant_db' }),
      })
    ).rejects.toThrow(/database login user must be a valid PostgreSQL identifier/);
  });

  it('CHARACTERIZATION: a malformed DB_URL silently falls back to POSTGRES_USER as the grantee', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({ DB_URL: 'not a url', POSTGRES_USER: 'fallback_user' }),
    });

    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "fallback_user"');
  });

  it('CHARACTERIZATION: a DB_URL with no userinfo falls back to POSTGRES_USER as the grantee', async () => {
    await ensureRlsRestrictedRoleMembership({
      env: env({ DB_URL: 'postgresql://db:5432/grant_db', POSTGRES_USER: 'fallback_user' }),
    });

    expect(unsafe).toHaveBeenCalledWith('GRANT "grant_app_restricted" TO "fallback_user"');
  });

  it('validation runs before any connection is opened', async () => {
    await expect(
      ensureRlsRestrictedRoleMembership({ env: env({ SECURITY_RLS_ROLE: 'bad;role' }) })
    ).rejects.toThrow();

    expect(postgresFactory).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });
});

describe('ensureRlsRestrictedRoleMembership — failure handling', () => {
  it('rethrows a permission-denied error after printing remediation guidance', async () => {
    const err = Object.assign(new Error('permission denied for role'), { code: '42501' });
    unsafe.mockRejectedValue(err);

    await expect(ensureRlsRestrictedRoleMembership({ env: env() })).rejects.toBe(err);

    expect(console.error).toHaveBeenCalledOnce();
    expect(vi.mocked(console.error).mock.calls[0][0]).toContain('DB_GRANT_ROLE_URL');
    expect(end).toHaveBeenCalledExactlyOnceWith({ timeout: 5 });
  });

  it('matches on the message alone when no SQLSTATE code is present', async () => {
    unsafe.mockRejectedValue(new Error('PERMISSION DENIED'));

    await expect(ensureRlsRestrictedRoleMembership({ env: env() })).rejects.toThrow();

    expect(console.error).toHaveBeenCalledOnce();
  });

  it('rethrows any other error without guidance', async () => {
    const err = Object.assign(new Error('connection refused'), { code: '08006' });
    unsafe.mockRejectedValue(err);

    await expect(ensureRlsRestrictedRoleMembership({ env: env() })).rejects.toBe(err);

    expect(console.error).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledOnce();
  });

  it('CHARACTERIZATION: a non-Error rejection is stringified and still matched on message', async () => {
    unsafe.mockRejectedValue('permission denied');

    await expect(ensureRlsRestrictedRoleMembership({ env: env() })).rejects.toBe(
      'permission denied'
    );

    expect(console.error).toHaveBeenCalledOnce();
  });

  it('CHARACTERIZATION: a client.end() failure replaces the original error', async () => {
    const grantError = new Error('grant failed');
    const endError = new Error('end failed');
    unsafe.mockRejectedValue(grantError);
    end.mockRejectedValue(endError);

    await expect(ensureRlsRestrictedRoleMembership({ env: env() })).rejects.toBe(endError);
  });

  it('logs success only when logSuccess is set', async () => {
    await ensureRlsRestrictedRoleMembership({ env: env() });
    expect(console.log).not.toHaveBeenCalled();

    await ensureRlsRestrictedRoleMembership({ env: env(), logSuccess: true });
    expect(console.log).toHaveBeenCalledOnce();
    expect(vi.mocked(console.log).mock.calls[0][0]).toContain(
      'Granted role "grant_app_restricted" to "grant_user"'
    );
  });
});
