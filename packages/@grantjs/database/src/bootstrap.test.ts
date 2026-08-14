/**
 * Tests for the two destructive orchestrators:
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

type ReservedSql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) & {
  release: () => void;
  statements: string[];
};

class SqlRecorder {
  readonly statements: string[] = [];
  readonly order: string[] = [];
  executeResults: unknown[][] = [];
  inTransaction = false;
  reserved: ReservedSql;
  release = vi.fn();

  constructor() {
    const statements: string[] = [];
    const release = this.release;
    const reservedFn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.reduce(
        (acc, part, i) => acc + part + (i < values.length ? '?' : ''),
        ''
      );
      statements.push(text.replace(/\s+/g, ' ').trim());
      return [];
    }) as unknown as ReservedSql;
    reservedFn.release = () => release();
    reservedFn.statements = statements;
    this.reserved = reservedFn;
  }

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

  get $client() {
    return {
      reserve: async () => this.reserved,
    };
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

  it('takes a session-pinned advisory lock before work and unlocks on the same reserved connection', async () => {
    await bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.reserved.statements[0]).toMatch(/pg_advisory_lock/);
    expect(db.reserved.statements.at(-1)).toMatch(/pg_advisory_unlock/);
    expect(db.release).toHaveBeenCalledOnce();
    // Lock statements never go through the pool.
    expect(db.statements.some((s) => s.includes('pg_advisory'))).toBe(false);
  });

  it('releases the reserved connection even when migrate throws', async () => {
    migrate.mockRejectedValue(new Error('migration failed'));

    await expect(bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID)).rejects.toThrow(
      'migration failed'
    );

    expect(db.reserved.statements.some((s) => s.includes('pg_advisory_unlock'))).toBe(true);
    expect(db.release).toHaveBeenCalledOnce();
    expect(seedAll).not.toHaveBeenCalled();
  });

  it('CHARACTERIZATION: the RLS grant is called with no arguments, so it falls back to getEnv() inside an otherwise fully-injected function', async () => {
    await bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID);

    // bootstrapDatabase receives `db` and `systemUserId` by injection, but this
    // step reads the environment directly. Contrast connection.ts, which reads
    // no env at all. Tier 3 in the pass-4 brief.
    expect(ensureRlsRestrictedRoleMembership).toHaveBeenCalledWith(undefined);
  });

  it('prefers the original work error when unlock fails', async () => {
    migrate.mockRejectedValue(new Error('migration failed'));
    const unlockFailure = new Error('unlock failed');
    const statements: string[] = [];
    const reservedFn = (async (strings: TemplateStringsArray) => {
      const text = strings.join('?').replace(/\s+/g, ' ').trim();
      statements.push(text);
      if (text.includes('unlock')) throw unlockFailure;
      return [];
    }) as unknown as ReservedSql;
    reservedFn.release = () => db.release();
    reservedFn.statements = statements;
    db.reserved = reservedFn;

    await expect(bootstrapDatabase(db as unknown as Db, SYSTEM_USER_ID)).rejects.toThrow(
      'migration failed'
    );
    expect(db.release).toHaveBeenCalledOnce();
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
  it('takes a session-pinned advisory lock first and unlocks on the same reserved connection', async () => {
    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.reserved.statements[0]).toMatch(/pg_advisory_lock/);
    expect(db.reserved.statements.at(-1)).toMatch(/pg_advisory_unlock/);
    expect(db.release).toHaveBeenCalledOnce();
  });

  it('does not sleep when no idle-in-transaction backend was terminated', async () => {
    await runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID);

    expect(db.statements.some((s) => s.includes('pg_sleep'))).toBe(false);
  });

  it('sleeps once after terminating stale backends', async () => {
    db.executeResults = [[{ pid: 1 }, { pid: 2 }]];

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

  it('releases the reserved connection even when reset throws', async () => {
    reset.mockRejectedValue(new Error('truncate failed'));

    await expect(runDemoRefresh(db as unknown as Db, SYSTEM_USER_ID)).rejects.toThrow(
      'truncate failed'
    );

    expect(db.reserved.statements.some((s) => s.includes('pg_advisory_unlock'))).toBe(true);
    expect(db.release).toHaveBeenCalledOnce();
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
