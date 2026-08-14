/**
 * Characterization tests for the two destructive orchestrators:
 * `bootstrapDatabase` (runs on every API start) and `runDemoRefresh` (truncates).
 *
 * Everything they call is mocked, so no migration runs and no table is touched.
 * The subject here is the *orchestration* — lock discipline, ordering, and what
 * survives a failure — not the steps themselves.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const migrate = vi.fn<() => Promise<void>>();
const ensureRlsRestrictedRoleMembership = vi.fn<(opts?: unknown) => Promise<void>>();
const seedAll = vi.fn<() => Promise<unknown>>();
const ensureSystemUserAndSigningKey = vi.fn<() => Promise<void>>();
const reset = vi.fn<() => Promise<void>>();

vi.mock('drizzle-orm/postgres-js/migrator', () => ({ migrate: () => migrate() }));
vi.mock('./grant-rls-login-role.lib', () => ({
  ensureRlsRestrictedRoleMembership: (opts?: unknown) => ensureRlsRestrictedRoleMembership(opts),
}));
vi.mock('./scripts/seed-permissions', () => ({ seedAll: () => seedAll() }));
vi.mock('./seed-core', () => ({
  ensureSystemUserAndSigningKey: () => ensureSystemUserAndSigningKey(),
}));
vi.mock('drizzle-seed', () => ({ reset: () => reset() }));

const { bootstrapDatabase } = await import('./bootstrap');
const { runDemoRefresh } = await import('./demo-refresh');

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Minimal stand-in recording the raw SQL issued and whether it went through a
 * transaction. Drizzle splits a `sql` template into `queryChunks`: literal SQL
 * arrives as a `StringChunk` whose `value` is a string array, interpolated
 * values as parameter objects. Both are kept — the parameters carry the lock
 * names, which is how the two advisory locks are told apart.
 */
function sqlText(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks ?? [];
  return chunks
    .map((chunk) => {
      const value = (chunk as { value?: unknown }).value;
      if (Array.isArray(value)) return value.join('');
      if (typeof value === 'string') return value;
      return '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

class SqlRecorder {
  readonly statements: string[] = [];
  readonly order: string[] = [];
  executeResults: unknown[][] = [];
  inTransaction = false;

  async execute(query: unknown): Promise<unknown[]> {
    const text = sqlText(query);
    this.statements.push(text);
    this.order.push(this.inTransaction ? `tx:${text}` : `pool:${text}`);
    return this.executeResults.shift() ?? [];
  }

  async transaction<T>(cb: (tx: SqlRecorder) => Promise<T>): Promise<T> {
    this.inTransaction = true;
    this.order.push('tx:BEGIN');
    try {
      return await cb(this);
    } finally {
      this.order.push('tx:COMMIT');
      this.inTransaction = false;
    }
  }
}

type Db = Parameters<typeof bootstrapDatabase>[0];

let db: SqlRecorder;

beforeEach(() => {
  vi.clearAllMocks();
  db = new SqlRecorder();
  migrate.mockResolvedValue(undefined);
  ensureRlsRestrictedRoleMembership.mockResolvedValue(undefined);
  seedAll.mockResolvedValue({});
  ensureSystemUserAndSigningKey.mockResolvedValue(undefined);
  reset.mockResolvedValue(undefined);
});

describe('bootstrapDatabase', () => {
  it('runs migrate, then the RLS grant, then seeds — with seeding inside one transaction', async () => {
    await bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID);

    expect(migrate).toHaveBeenCalledOnce();
    expect(ensureRlsRestrictedRoleMembership).toHaveBeenCalledOnce();
    expect(ensureSystemUserAndSigningKey).toHaveBeenCalledOnce();
    expect(seedAll).toHaveBeenCalledOnce();
    expect(db.order).toContain('tx:BEGIN');
    expect(db.order).toContain('tx:COMMIT');
  });

  it('takes an advisory lock first and releases it last', async () => {
    await bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.statements[0]).toContain('pg_advisory_lock');
    expect(db.statements[db.statements.length - 1]).toContain('pg_advisory_unlock');
  });

  it('releases the lock even when migrate throws', async () => {
    migrate.mockRejectedValue(new Error('migration failed'));

    await expect(bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID)).rejects.toThrow(
      'migration failed'
    );

    expect(db.statements.some((s) => s.includes('pg_advisory_unlock'))).toBe(true);
    expect(seedAll).not.toHaveBeenCalled();
  });

  it('CHARACTERIZATION: lock and unlock are two independent pool statements, not pinned to one session', async () => {
    await bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID);

    // pg_advisory_lock is *session*-scoped. Both statements go out via
    // `db.execute` on the pooled drizzle instance with nothing reserving a
    // single connection — no `transaction`, no reserved client. Under a pool
    // (default max: 10) the unlock can be served by a different backend than
    // the one holding the lock, in which case pg_advisory_unlock returns false
    // and the lock stays held until that backend's session ends.
    const locks = db.order.filter((s) => s.includes('pg_advisory'));
    expect(locks).toEqual([
      expect.stringMatching(/^pool:.*pg_advisory_lock/),
      expect.stringMatching(/^pool:.*pg_advisory_unlock/),
    ]);
    // Neither is inside the transaction that would pin them together.
    expect(locks.every((s) => s.startsWith('pool:'))).toBe(true);
  });

  it('CHARACTERIZATION: the RLS grant is called with no arguments, so it falls back to getEnv() inside an otherwise fully-injected function', async () => {
    await bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID);

    // bootstrapDatabase receives `db` and `systemUserId` by injection, but this
    // step reads the environment directly. Contrast connection.ts, which reads
    // no env at all. Tier 3 in the pass-4 brief.
    expect(ensureRlsRestrictedRoleMembership).toHaveBeenCalledWith(undefined);
  });

  it('CHARACTERIZATION: a failed unlock masks the original error, because finally awaits without catching', async () => {
    migrate.mockRejectedValue(new Error('migration failed'));
    const recorder = new SqlRecorder();
    const unlockFailure = new Error('unlock failed');
    recorder.execute = vi.fn(async (query: unknown) => {
      if (sqlText(query).includes('unlock')) throw unlockFailure;
      return [];
    }) as SqlRecorder['execute'];

    await expect(bootstrapDatabase(recorder as unknown as Db, SYSTEM_USER_ID)).rejects.toBe(
      unlockFailure
    );
  });
});

describe('runDemoRefresh', () => {
  it('resets, then re-seeds the system user, then the permission model', async () => {
    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    expect(reset).toHaveBeenCalledOnce();
    expect(ensureSystemUserAndSigningKey).toHaveBeenCalledOnce();
    expect(seedAll).toHaveBeenCalledOnce();
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(
      ensureSystemUserAndSigningKey.mock.invocationCallOrder[0]
    );
    expect(ensureSystemUserAndSigningKey.mock.invocationCallOrder[0]).toBeLessThan(
      seedAll.mock.invocationCallOrder[0]
    );
  });

  // The lock *name* ('grant-demo-refresh' vs 'grant-db-bootstrap') is a source
  // constant interpolated as a bound parameter, so asserting it here would test
  // drizzle's chunk representation rather than this package's behavior.
  it('takes an advisory lock first and releases it last', async () => {
    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.statements[0]).toContain('pg_advisory_lock');
    expect(db.statements[db.statements.length - 1]).toContain('pg_advisory_unlock');
  });

  it('does not sleep when no idle-in-transaction backend was terminated', async () => {
    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.statements.some((s) => s.includes('pg_sleep'))).toBe(false);
  });

  it('sleeps once after terminating stale backends', async () => {
    // lock -> terminate (2 rows) -> sleep
    db.executeResults = [[], [{ pid: 1 }, { pid: 2 }]];

    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.statements.filter((s) => s.includes('pg_sleep'))).toHaveLength(1);
  });

  it('CHARACTERIZATION: terminates other backends unconditionally, including ones unrelated to this database', async () => {
    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    const terminate = db.statements.find((s) => s.includes('pg_terminate_backend'));
    // pg_stat_activity is cluster-wide. The filter excludes only the caller's
    // own backend (`pid <> pg_backend_pid()`) and idle-in-transaction sessions
    // older than the threshold — it does not filter on datname. Safe today
    // because the job is double-gated on demo mode (see demo-db-refresh.job.ts).
    expect(terminate).toContain('pg_stat_activity');
    expect(terminate).toContain('pid <> pg_backend_pid()');
    expect(terminate).not.toContain('datname');
  });

  it('releases the lock even when reset throws', async () => {
    reset.mockRejectedValue(new Error('truncate failed'));

    await expect(runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID)).rejects.toThrow(
      'truncate failed'
    );

    expect(db.statements.some((s) => s.includes('pg_advisory_unlock'))).toBe(true);
    expect(seedAll).not.toHaveBeenCalled();
  });

  it('CHARACTERIZATION: unlike bootstrap, the reset and re-seed are NOT wrapped in a transaction, so a mid-run failure leaves the database truncated and unseeded', async () => {
    seedAll.mockRejectedValue(new Error('seed failed'));

    await expect(runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID)).rejects.toThrow(
      'seed failed'
    );

    expect(reset).toHaveBeenCalledOnce();
    expect(db.order).not.toContain('tx:BEGIN');
  });
});
