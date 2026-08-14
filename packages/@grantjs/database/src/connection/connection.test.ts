/**
 * Tests for the connection module.
 *
 * `connection` is a module-level singleton, so each test re-imports the module
 * through `vi.resetModules()` to get a fresh one. `postgres` and `drizzle` are
 * mocked — nothing here opens a socket.
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
    try {
      initializeDBConnection({ connectionString: '' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as { code?: string }).code).toBe('CONFIGURATION_ERROR');
    }
    expect(postgresFactory).not.toHaveBeenCalled();
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
  it('returns the existing connection on a second call with the same string', async () => {
    const { initializeDBConnection } = await freshModule();

    const first = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    const second = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });

    expect(second).toBe(first);
    expect(postgresFactory).toHaveBeenCalledOnce();
  });

  it('throws when a second call uses a different connection string', async () => {
    const { initializeDBConnection } = await freshModule();
    const logger = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@primary:5432/d', logger });

    expect(() =>
      initializeDBConnection({
        connectionString: 'postgresql://u:p@replica:5432/other',
        logger,
      })
    ).toThrow(/different connection string/);

    expect(postgresFactory).toHaveBeenCalledOnce();
    expect(postgresFactory).toHaveBeenCalledWith(
      'postgresql://u:p@primary:5432/d',
      expect.anything()
    );
  });

  it('warns on a same-string re-init and keeps the original pool options', async () => {
    const { initializeDBConnection } = await freshModule();
    const logger = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', max: 10, logger });
    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', max: 1, logger });

    expect(postgresFactory).toHaveBeenCalledExactlyOnceWith(
      'postgresql://u:p@h:5432/d',
      expect.objectContaining({ max: 10 })
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Database connection already initialized. Returning existing connection.'
    );
  });

  it('does not reassign the module logger on a no-op same-string re-init', async () => {
    const { initializeDBConnection, closeDatabase } = await freshModule();
    const first = fakeLogger();
    const second = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger: first });
    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger: second });
    await closeDatabase();

    expect(first.info).toHaveBeenCalledWith('Database connection closed');
    expect(second.info).not.toHaveBeenCalledWith('Database connection closed');
  });

  it('keeps the original logger when a same-string re-init omits logger', async () => {
    const { initializeDBConnection, closeDatabase } = await freshModule();
    const logger = fakeLogger();

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger });
    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    await closeDatabase();

    expect(logger.info).toHaveBeenCalledWith('Database connection closed');
  });
});

describe('getDatabase / isDatabaseInitialized', () => {
  it('throws before initialization and returns the db after', async () => {
    const { initializeDBConnection, getDatabase, isDatabaseInitialized } = await freshModule();

    expect(isDatabaseInitialized()).toBe(false);
    expect(() => getDatabase()).toThrow(/Call initializeDBConnection\(\) first/);

    const db = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });

    expect(isDatabaseInitialized()).toBe(true);
    expect(getDatabase()).toBe(db);
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

  it('clears the singleton even when client.end() rejects, so retry can open a new pool', async () => {
    const { initializeDBConnection, closeDatabase, isDatabaseInitialized, getDatabase } =
      await freshModule();
    const logger = fakeLogger();
    const failure = new Error('end failed');
    end.mockRejectedValue(failure);

    initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d', logger });

    await expect(closeDatabase()).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith(
      { err: failure },
      'Error closing database connection'
    );

    expect(isDatabaseInitialized()).toBe(false);
    expect(() => getDatabase()).toThrow(/Call initializeDBConnection\(\) first/);

    end.mockResolvedValue(undefined);
    const retry = initializeDBConnection({ connectionString: 'postgresql://u:p@h:5432/d' });
    expect(retry).toBeDefined();
    expect(postgresFactory).toHaveBeenCalledTimes(2);
  });
});
