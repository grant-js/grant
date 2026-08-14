/**
 * Characterization tests for the connection module.
 *
 * `connection` is a module-level singleton, so each test re-imports the module
 * through `vi.resetModules()` to get a fresh one. `postgres` and `drizzle` are
 * mocked — nothing here opens a socket.
 *
 * Assertions describe what the code does *today*. Anything surprising is
 * labelled CHARACTERIZATION and reported rather than fixed here.
 */
import type { ILogger } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const end = vi.fn<() => Promise<void>>();
const postgresFactory = vi.fn(() => ({ end }));
const drizzleFactory = vi.fn((client: unknown) => ({ __client: client }));

vi.mock('postgres', () => ({
  default: (...args: unknown[]) => postgresFactory(...(args as [])),
}));

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: (...args: unknown[]) => drizzleFactory(...(args as [unknown])),
}));

// `freshModule()` re-imports ./connection once per test via vi.resetModules(),
// and ./connection pulls the full 110-table schema barrel. Unmocked, that
// barrel is re-evaluated 17 times and the first cold import exceeded vitest's
// 5s default in CI. `drizzle` is mocked, so the real schema is never read.
vi.mock('../schemas', () => ({ schema: {} }));

function fakeLogger(): ILogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as ILogger;
}

async function freshModule() {
  vi.resetModules();
  return import('./connection');
}

beforeEach(() => {
  vi.clearAllMocks();
  end.mockResolvedValue(undefined);
});

describe('initializeDBConnection — first call', () => {
  it('builds the pool with the documented defaults', async () => {
    const { initializeDBConnection } = await freshModule();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });

    expect(postgresFactory).toHaveBeenCalledExactlyOnceWith('postgresql://u:p@h:5432/d', {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 1800,
    });
  });

  it('passes every override through to the pool', async () => {
    const { initializeDBConnection } = await freshModule();

    initializeDBConnection({
      connectionString: 'postgresql://u:p@h:5432/d',
      max: 3,
      idleTimeout: 1,
      connectTimeout: 2,
      maxLifetime: 0,
    });

    expect(postgresFactory).toHaveBeenCalledWith('postgresql://u:p@h:5432/d', {
      max: 3,
      idle_timeout: 1,
      connect_timeout: 2,
      max_lifetime: 0,
    });
  });

  it('rejects an empty connection string before constructing a pool', async () => {
    const { initializeDBConnection } = await freshModule();

    expect(() => initializeDBConnection({ connectionString: '' })).toThrow(
      'Database connection string is required'
    );
    expect(postgresFactory).not.toHaveBeenCalled();
  });

  it('CHARACTERIZATION: that rejection is a bare Error, not a ConfigurationError', async () => {
    const { initializeDBConnection } = await freshModule();

    // @grantjs/core exports ConfigurationError and this module already imports
    // ILogger from it, so the domain error is available — see AGENTS.md
    // § Error handling, "always use domain-specific errors".
    try {
      initializeDBConnection({ connectionString: '' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as Error).constructor.name).toBe('Error');
    }
  });

  it('logs initialization when a logger is supplied, and is silent without one', async () => {
    const { initializeDBConnection } = await freshModule();
    const logger = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger });

    expect(logger.info).toHaveBeenCalledWith('Database connection initialized');

    const second = await freshModule();
    expect(() =>
      second.initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' })
    ).not.toThrow();
  });
});

describe('initializeDBConnection — the module-level singleton', () => {
  it('returns the existing connection on a second call', async () => {
    const { initializeDBConnection } = await freshModule();

    const first = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    const second = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });

    expect(second).toBe(first);
    expect(postgresFactory).toHaveBeenCalledOnce();
  });

  it('CHARACTERIZATION: a second call with a DIFFERENT connection string is ignored, and the caller is handed the first database', async () => {
    const { initializeDBConnection } = await freshModule();
    const logger = fakeLogger();

    const first = initializeDBConnection({ connectionString: 'postgresql://u:p@primary:5432/d' });
    const second = initializeDBConnection({
      connectionString: 'postgresql://u:p@replica:5432/other',
      logger,
    });

    // Same object: the caller believes it is talking to `replica/other`.
    expect(second).toBe(first);
    expect(postgresFactory).toHaveBeenCalledOnce();
    expect(postgresFactory).toHaveBeenCalledWith(
      'postgresql://u:p@primary:5432/d',
      expect.anything()
    );
    // The only signal is a warning, which is dropped entirely when no logger
    // is passed — the default in every script in this package.
    expect(logger.warn).toHaveBeenCalledWith(
      'Database connection already initialized. Returning existing connection.'
    );
  });

  it('CHARACTERIZATION: max/timeout overrides on a second call are silently discarded too', async () => {
    const { initializeDBConnection } = await freshModule();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', max: 10 });
    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', max: 1 });

    expect(postgresFactory).toHaveBeenCalledExactlyOnceWith(
      'postgresql://u:p@h:5432/d',
      expect.objectContaining({ max: 10 })
    );
  });

  it('CHARACTERIZATION: moduleLogger is reassigned before the guard, so a later caller re-targets logging for a connection it did not create', async () => {
    const { initializeDBConnection, closeDatabase } = await freshModule();
    const first = fakeLogger();
    const second = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger: first });
    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger: second });
    await closeDatabase();

    // The close belongs to the connection `first` opened, but is logged to `second`.
    expect(second.info).toHaveBeenCalledWith('Database connection closed');
    expect(first.info).not.toHaveBeenCalledWith('Database connection closed');
  });

  it('CHARACTERIZATION: passing no logger on the second call blanks logging entirely', async () => {
    const { initializeDBConnection, closeDatabase } = await freshModule();
    const logger = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger });
    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    await closeDatabase();

    expect(logger.info).not.toHaveBeenCalledWith('Database connection closed');
  });
});

describe('getDatabase / isDatabaseInitialized', () => {
  it('throws before initialization and returns the db after', async () => {
    const { initializeDBConnection, getDatabase, isDatabaseInitialized } = await freshModule();

    expect(isDatabaseInitialized()).toBe(false);
    expect(() => getDatabase()).toThrow('Database not initialized');

    const db = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });

    expect(isDatabaseInitialized()).toBe(true);
    expect(getDatabase()).toBe(db);
  });

  it('CHARACTERIZATION: the error names initializeDatabase(), a function this package does not export', async () => {
    const module = await freshModule();

    expect(() => module.getDatabase()).toThrow(/Call initializeDatabase\(\) first/);
    expect('initializeDatabase' in module).toBe(false);
    expect('initializeDBConnection' in module).toBe(true);
  });
});

describe('closeDatabase', () => {
  it('ends the client and clears the singleton', async () => {
    const { initializeDBConnection, closeDatabase, isDatabaseInitialized } = await freshModule();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    await closeDatabase();

    expect(end).toHaveBeenCalledOnce();
    expect(isDatabaseInitialized()).toBe(false);
  });

  it('is a no-op when nothing is open, and does not throw', async () => {
    const { closeDatabase } = await freshModule();

    await expect(closeDatabase()).resolves.toBeUndefined();
    expect(end).not.toHaveBeenCalled();
  });

  it('re-initialization after a close builds a genuinely new pool', async () => {
    const { initializeDBConnection, closeDatabase } = await freshModule();

    initializeDBConnection({ connectionString: 'postgresql://u:p@a:5432/d' });
    await closeDatabase();
    initializeDBConnection({ connectionString: 'postgresql://u:p@b:5432/d' });

    expect(postgresFactory).toHaveBeenCalledTimes(2);
    expect(postgresFactory).toHaveBeenLastCalledWith(
      'postgresql://u:p@b:5432/d',
      expect.anything()
    );
  });

  it('CHARACTERIZATION: when client.end() rejects, the singleton is left populated, so the process still believes it holds a live connection', async () => {
    const { initializeDBConnection, closeDatabase, isDatabaseInitialized, getDatabase } =
      await freshModule();
    const logger = fakeLogger();
    const failure = new Error('end failed');
    end.mockRejectedValue(failure);

    const db = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger });

    await expect(closeDatabase()).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith(
      { err: failure },
      'Error closing database connection'
    );

    // `connection = null` sits after the await inside try, so it never runs.
    expect(isDatabaseInitialized()).toBe(true);
    expect(getDatabase()).toBe(db);
  });

  it('CHARACTERIZATION: a failed close also blocks re-initialization — the retry silently returns the dead connection', async () => {
    const { initializeDBConnection, closeDatabase } = await freshModule();
    end.mockRejectedValue(new Error('end failed'));

    const db = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    await expect(closeDatabase()).rejects.toThrow();

    const retry = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });

    expect(retry).toBe(db);
    expect(postgresFactory).toHaveBeenCalledOnce();
  });
});
