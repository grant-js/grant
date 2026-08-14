import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withSessionAdvisoryLock } from './with-session-advisory-lock.lib';

type ReservedSql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) & {
  release: ReturnType<typeof vi.fn>;
  statements: string[];
};

function makeDb(reserved: ReservedSql) {
  return {
    $client: {
      reserve: vi.fn(async () => reserved),
    },
  };
}

function makeReserved(opts?: { unlockThrows?: Error }): ReservedSql {
  const statements: string[] = [];
  const release = vi.fn();
  const fn = (async (strings: TemplateStringsArray) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    statements.push(text);
    if (opts?.unlockThrows && text.includes('unlock')) throw opts.unlockThrows;
    return [];
  }) as unknown as ReservedSql;
  fn.release = release;
  fn.statements = statements;
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('withSessionAdvisoryLock', () => {
  it('locks, runs work, unlocks, then releases on the same reserved connection', async () => {
    const reserved = makeReserved();
    const db = makeDb(reserved);
    const work = vi.fn(async () => 'ok');

    await expect(
      withSessionAdvisoryLock(db as never, 'grant-test-lock', work)
    ).resolves.toBe('ok');

    expect(db.$client.reserve).toHaveBeenCalledOnce();
    expect(reserved.statements[0]).toMatch(/pg_advisory_lock/);
    expect(reserved.statements[1]).toMatch(/pg_advisory_unlock/);
    expect(reserved.release).toHaveBeenCalledOnce();
    expect(work).toHaveBeenCalledOnce();
  });

  it('unlocks and releases when work throws, rethrowing the work error', async () => {
    const reserved = makeReserved();
    const db = makeDb(reserved);
    const failure = new Error('work failed');

    await expect(
      withSessionAdvisoryLock(db as never, 'grant-test-lock', async () => {
        throw failure;
      })
    ).rejects.toBe(failure);

    expect(reserved.statements.some((s) => s.includes('unlock'))).toBe(true);
    expect(reserved.release).toHaveBeenCalledOnce();
  });

  it('does not let an unlock failure mask the original work error', async () => {
    const workError = new Error('work failed');
    const reserved = makeReserved({ unlockThrows: new Error('unlock failed') });
    const db = makeDb(reserved);

    await expect(
      withSessionAdvisoryLock(db as never, 'grant-test-lock', async () => {
        throw workError;
      })
    ).rejects.toBe(workError);

    expect(reserved.release).toHaveBeenCalledOnce();
  });

  it('rethrows unlock failure when work succeeded', async () => {
    const unlockError = new Error('unlock failed');
    const reserved = makeReserved({ unlockThrows: unlockError });
    const db = makeDb(reserved);

    await expect(
      withSessionAdvisoryLock(db as never, 'grant-test-lock', async () => 'ok')
    ).rejects.toBe(unlockError);

    expect(reserved.release).toHaveBeenCalledOnce();
  });
});
