import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Characterizes `PivotRepository`, inherited by the ~50 pivot repositories and
 * previously untested.
 *
 * Three behaviours below are load-bearing and none of them is visible from the
 * method signatures:
 *
 *   1. `whereUnique` returns `undefined` when the caller supplies none of the
 *      unique-index fields, and `countActive` then falls back to the
 *      soft-delete guard alone — counting **every active row in the table**
 *      rather than none. A caller that forgets a field gets a plausible number
 *      instead of an error.
 *   2. `toInsertValues` spreads `params` wholesale, so any key the caller
 *      passes reaches the insert.
 *   3. `first` is typed `(result: T | T[]) => T` but returns `undefined` for an
 *      empty array. The signature does not admit that.
 */
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  const tag =
    (op: string) =>
    (...args: unknown[]) => ({ op, args });
  return {
    ...actual,
    eq: tag('eq'),
    and: tag('and'),
    isNull: tag('isNull'),
    inArray: tag('inArray'),
  };
});

const { PivotRepository } = await import('@/repositories/common/PivotRepository');

type Tagged = { op: string; args: unknown[] };

const columns = {
  id: 'col:id',
  groupId: 'col:groupId',
  tagId: 'col:tagId',
  deletedAt: 'col:deletedAt',
} as const;

class ProbePivotRepository extends PivotRepository<never, never> {
  protected table = columns;
  protected uniqueIndexFields = ['groupId', 'tagId'] as never;
  protected toEntity = (row: never) => row;

  public callWhereUnique(params: Record<string, unknown>) {
    return (this as unknown as Record<string, CallableFunction>).whereUnique(params);
  }

  public callToInsertValues(params: Record<string, unknown>) {
    return (this as unknown as Record<string, CallableFunction>).toInsertValues(params);
  }

  public callFirst<T>(result: T | T[]) {
    return (this as unknown as Record<string, CallableFunction>).first(result);
  }

  public callCountActive(params: Record<string, unknown>) {
    return (this as unknown as Record<string, CallableFunction>).countActive(params);
  }
}

let repo: ProbePivotRepository;
let where: ReturnType<typeof vi.fn>;

beforeEach(() => {
  where = vi.fn().mockResolvedValue([{ count: 7 }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  repo = new ProbePivotRepository({ select } as never);
});

describe('whereUnique', () => {
  it('matches on a single supplied field', () => {
    expect(repo.callWhereUnique({ groupId: 'g1' })).toEqual({
      op: 'eq',
      args: ['col:groupId', 'g1'],
    });
  });

  it('ANDs every supplied unique field', () => {
    const result = repo.callWhereUnique({ groupId: 'g1', tagId: 't1' }) as Tagged;

    expect(result.op).toBe('and');
    expect(result.args).toEqual([
      { op: 'eq', args: ['col:groupId', 'g1'] },
      { op: 'eq', args: ['col:tagId', 't1'] },
    ]);
  });

  it('ignores keys that are not unique-index fields', () => {
    expect(repo.callWhereUnique({ groupId: 'g1', unrelated: 'x' })).toEqual({
      op: 'eq',
      args: ['col:groupId', 'g1'],
    });
  });

  it('returns undefined when no unique field is supplied', () => {
    expect(repo.callWhereUnique({})).toBeUndefined();
    expect(repo.callWhereUnique({ unrelated: 'x' })).toBeUndefined();
  });

  // undefined means "omit"; null is a value and is matched.
  it('treats undefined as absent but null as a value', () => {
    expect(repo.callWhereUnique({ groupId: undefined })).toBeUndefined();
    expect(repo.callWhereUnique({ groupId: null })).toEqual({
      op: 'eq',
      args: ['col:groupId', null],
    });
  });
});

describe('countActive', () => {
  it('scopes the count by the unique fields and the soft-delete guard', async () => {
    await repo.callCountActive({ groupId: 'g1' });

    expect(where).toHaveBeenCalledWith({
      op: 'and',
      args: [
        { op: 'eq', args: ['col:groupId', 'g1'] },
        { op: 'isNull', args: ['col:deletedAt'] },
      ],
    });
  });

  // The widening case: with no unique field the count covers the whole table.
  it('counts every active row when no unique field is supplied', async () => {
    await repo.callCountActive({});

    expect(where).toHaveBeenCalledWith({ op: 'isNull', args: ['col:deletedAt'] });
  });

  it('coerces a missing count row to zero', async () => {
    where.mockResolvedValue([]);

    await expect(repo.callCountActive({ groupId: 'g1' })).resolves.toBe(0);
  });
});

describe('toInsertValues', () => {
  it('stamps the lifecycle columns and clears deletedAt', () => {
    const values = repo.callToInsertValues({ groupId: 'g1' });

    expect(values.groupId).toBe('g1');
    expect(values.deletedAt).toBeNull();
    expect(values.createdAt).toBeInstanceOf(Date);
    expect(values.updatedAt).toBeInstanceOf(Date);
  });

  // Worth knowing before trusting this with request-shaped input.
  it('passes through any key the caller supplies', () => {
    expect(repo.callToInsertValues({ groupId: 'g1', arbitrary: 'x' }).arbitrary).toBe('x');
  });

  it('lets a caller-supplied deletedAt be overridden to null', () => {
    expect(repo.callToInsertValues({ deletedAt: new Date() }).deletedAt).toBeNull();
  });
});

describe('first', () => {
  it('unwraps the head of an array', () => {
    expect(repo.callFirst([{ id: 'a' }, { id: 'b' }])).toEqual({ id: 'a' });
  });

  it('passes a non-array through unchanged', () => {
    expect(repo.callFirst({ id: 'a' })).toEqual({ id: 'a' });
  });

  // The signature promises T. It does not deliver one here.
  it('returns undefined for an empty array despite the T return type', () => {
    expect(repo.callFirst([])).toBeUndefined();
  });
});
