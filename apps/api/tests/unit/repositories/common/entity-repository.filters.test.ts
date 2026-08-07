import { SortOrder } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Characterizes `EntityRepository`'s query-building surface, which 52
 * repositories inherit and none tested.
 *
 * Two behaviours here are security-relevant and neither is obvious from the
 * signature:
 *
 *   1. `where()` always appends `isNull(deletedAt)`. No filter a caller can
 *      express may drop it, or soft-deleted rows become reachable.
 *   2. An unrecognised operator or an unknown column makes
 *      `buildFilterCondition` return `undefined`, and `where()` then omits it.
 *      A typo'd filter therefore *widens* the result set instead of failing.
 *      That is the current contract; these tests pin it so a change is a
 *      deliberate one rather than a silent one.
 *
 * Drizzle's operators are mocked into tagged plain objects so assertions read
 * as the SQL shape rather than as opaque builder internals.
 */
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  const tag =
    (op: string) =>
    (...args: unknown[]) => ({ op, args });
  return {
    ...actual,
    eq: tag('eq'),
    gte: tag('gte'),
    lte: tag('lte'),
    ilike: tag('ilike'),
    isNull: tag('isNull'),
    inArray: tag('inArray'),
    and: tag('and'),
    or: tag('or'),
    asc: tag('asc'),
    desc: tag('desc'),
  };
});

const { EntityRepository } = await import('@/repositories/common/EntityRepository');

type Tagged = { op: string; args: unknown[] };

const columns = {
  id: 'col:id',
  name: 'col:name',
  email: 'col:email',
  deletedAt: 'col:deletedAt',
  providerData: 'col:providerData',
} as const;

class ProbeRepository extends EntityRepository<never, never> {
  protected table = columns;
  protected schemaName = 'probe' as never;
  protected searchFields = ['name', 'email'] as never;
  protected defaultSortField = 'name' as never;
  protected relations = {} as never;

  public callWhere(...args: Parameters<ProbeRepository['exposedWhere']>) {
    return this.exposedWhere(...args);
  }

  public callFilter(filter: unknown) {
    return this.exposedFilter(filter);
  }

  public callOrderBy(sort: { field: string; order: SortOrder } | null) {
    return this.exposedOrderBy(sort);
  }

  // `private` is erased at runtime; these reach the real implementations.
  private exposedWhere(ids?: string[] | null, search?: string | null, filters?: unknown) {
    return (this as unknown as Record<string, CallableFunction>).where(ids, search, filters);
  }

  private exposedFilter(filter: unknown) {
    return (this as unknown as Record<string, CallableFunction>).buildFilterCondition(filter);
  }

  private exposedOrderBy(sort: unknown) {
    return (this as unknown as Record<string, CallableFunction>).orderBy(sort);
  }
}

let repo: ProbeRepository;

beforeEach(() => {
  repo = new ProbeRepository({} as never);
});

describe('where', () => {
  it('applies the soft-delete guard even with no arguments', () => {
    expect(repo.callWhere()).toEqual({ op: 'isNull', args: ['col:deletedAt'] });
  });

  it('keeps the soft-delete guard alongside every other condition', () => {
    const result = repo.callWhere(['a'], 'term', {
      field: 'name',
      operator: 'eq',
      value: 'x',
    }) as Tagged;

    expect(result.op).toBe('and');
    expect(result.args).toContainEqual({ op: 'isNull', args: ['col:deletedAt'] });
  });

  // The guard is the only condition when a filter is silently dropped, so this
  // is the case where a bad filter returns the whole table minus deletions.
  it('still guards soft deletes when the filter is unusable', () => {
    expect(repo.callWhere(null, null, { field: 'name', operator: 'nope', value: 1 })).toEqual({
      op: 'isNull',
      args: ['col:deletedAt'],
    });
  });

  it('ignores an empty id list but honours a populated one', () => {
    expect(repo.callWhere([])).toEqual({ op: 'isNull', args: ['col:deletedAt'] });

    const result = repo.callWhere(['a', 'b']) as Tagged;
    expect(result.args).toContainEqual({ op: 'inArray', args: ['col:id', ['a', 'b']] });
  });

  it('searches every configured field with a wrapped term', () => {
    const result = repo.callWhere(null, ' term ') as Tagged;
    const searchGroup = result.args.find(
      (arg): arg is Tagged => (arg as Tagged).op === 'or'
    ) as Tagged;

    expect(searchGroup.args).toEqual([
      { op: 'ilike', args: ['col:name', '%term%'] },
      { op: 'ilike', args: ['col:email', '%term%'] },
    ]);
  });

  it('ignores a whitespace-only search', () => {
    expect(repo.callWhere(null, '   ')).toEqual({ op: 'isNull', args: ['col:deletedAt'] });
  });
});

describe('buildFilterCondition — operators', () => {
  it.each([
    ['eq', 'eq'],
    ['gte', 'gte'],
    ['lte', 'lte'],
    ['ilike', 'ilike'],
  ])('maps %s onto a column comparison', (operator, expected) => {
    expect(repo.callFilter({ field: 'name', operator, value: 'v' })).toEqual({
      op: expected,
      args: ['col:name', 'v'],
    });
  });

  it('maps isNull without a value', () => {
    expect(repo.callFilter({ field: 'name', operator: 'isNull' })).toEqual({
      op: 'isNull',
      args: ['col:name'],
    });
  });

  it('maps in only when the value is an array', () => {
    expect(repo.callFilter({ field: 'id', operator: 'in', value: ['a'] })).toEqual({
      op: 'inArray',
      args: ['col:id', ['a']],
    });
    expect(repo.callFilter({ field: 'id', operator: 'in', value: 'a' })).toBeUndefined();
  });

  it('drops an unknown operator rather than rejecting it', () => {
    expect(repo.callFilter({ field: 'name', operator: 'DROP TABLE', value: 'x' })).toBeUndefined();
  });

  it('drops a filter on a column the table does not have', () => {
    expect(repo.callFilter({ field: 'nonexistent', operator: 'eq', value: 'x' })).toBeUndefined();
  });
});

describe('buildFilterCondition — JSON paths', () => {
  it('navigates with -> and reads the leaf with ->>', () => {
    const result = repo.callFilter({
      field: 'providerData.otp.token',
      operator: 'eq',
      value: 'abc',
    }) as Tagged;

    expect(result.op).toBe('eq');
    expect(result.args[1]).toBe('abc');
  });

  it('applies the same operator set as a plain column', () => {
    for (const operator of ['eq', 'gte', 'lte', 'ilike']) {
      expect(repo.callFilter({ field: 'providerData.x', operator, value: 1 })).toBeDefined();
    }
    expect(repo.callFilter({ field: 'providerData.x', operator: 'isNull' })).toBeDefined();
    expect(repo.callFilter({ field: 'providerData.x', operator: 'bogus' })).toBeUndefined();
  });

  it('drops a JSON path rooted at an unknown column', () => {
    expect(repo.callFilter({ field: 'missing.a.b', operator: 'eq', value: 1 })).toBeUndefined();
  });
});

describe('buildFilterCondition — groups', () => {
  const eqName = { field: 'name', operator: 'eq', value: 'n' };
  const eqEmail = { field: 'email', operator: 'eq', value: 'e' };

  it('ANDs a bare array', () => {
    const result = repo.callFilter([eqName, eqEmail]) as Tagged;

    expect(result.op).toBe('and');
    expect(result.args).toHaveLength(2);
  });

  it('honours the logic of an explicit group', () => {
    expect((repo.callFilter({ logic: 'OR', conditions: [eqName, eqEmail] }) as Tagged).op).toBe(
      'or'
    );
    expect((repo.callFilter({ logic: 'AND', conditions: [eqName, eqEmail] }) as Tagged).op).toBe(
      'and'
    );
  });

  it('nests groups', () => {
    const result = repo.callFilter({
      logic: 'OR',
      conditions: [eqName, { logic: 'AND', conditions: [eqEmail, eqName] }],
    }) as Tagged;

    expect(result.op).toBe('or');
    expect((result.args[1] as Tagged).op).toBe('and');
  });

  // A group whose members are all unusable collapses to undefined, so the
  // caller's intent disappears entirely rather than matching nothing.
  it('collapses a group whose conditions are all dropped', () => {
    expect(
      repo.callFilter({ logic: 'AND', conditions: [{ field: 'nope', operator: 'eq', value: 1 }] })
    ).toBeUndefined();
    expect(repo.callFilter([])).toBeUndefined();
  });

  it('keeps the usable half of a partially-dropped group', () => {
    const result = repo.callFilter([eqName, { field: 'nope', operator: 'eq', value: 1 }]) as Tagged;

    expect(result.op).toBe('and');
    expect(result.args).toHaveLength(1);
  });

  it('returns undefined for a shape that is neither condition nor group', () => {
    expect(repo.callFilter({ nonsense: true })).toBeUndefined();
  });
});

// orderBy returns an array — Drizzle's `orderBy()` is variadic, and callers
// spread the result rather than passing it as one term.
describe('orderBy', () => {
  // The default path emits a bare column with no direction applied, unlike the
  // explicit path which always wraps in asc()/desc(). Postgres defaults a bare
  // ORDER BY term to ASC, so the two agree in practice — but only by database
  // convention, not because the code says so.
  it('emits the default sort field without an explicit direction', () => {
    expect(repo.callOrderBy(null)).toEqual(['col:name']);
  });

  it('honours an explicit direction', () => {
    expect(repo.callOrderBy({ field: 'email', order: SortOrder.Desc })).toEqual([
      { op: 'desc', args: ['col:email'] },
    ]);
  });

  it('defaults to ascending', () => {
    expect(repo.callOrderBy({ field: 'email', order: SortOrder.Asc })).toEqual([
      { op: 'asc', args: ['col:email'] },
    ]);
  });
});
