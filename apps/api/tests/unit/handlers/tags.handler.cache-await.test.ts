import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TagHandler } from '@/handlers/tags.handler';

/**
 * Regression: createTag/deleteTag mutated the scope cache without awaiting, so the
 * transaction could commit before the cache write resolved and a rejection surfaced
 * as an unhandled promise rejection instead of a failed request.
 */

const mockTx = {};
const mockWithTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));

const scope = { tenant: Tenant.Organization, id: 'org-id' };
const cacheKey = `${scope.tenant}:${scope.id}`;

const tagRow = {
  id: 'tag-1',
  name: 'Urgent',
  color: '#ff0000',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null as Date | null,
};

const mockTags = {
  createTag: vi.fn().mockResolvedValue(tagRow),
  deleteTag: vi.fn().mockResolvedValue(tagRow),
  getTags: vi.fn(),
  updateTag: vi.fn(),
};

const mockOrganizationTags = {
  addOrganizationTag: vi.fn().mockResolvedValue(undefined),
  removeOrganizationTag: vi.fn().mockResolvedValue(undefined),
};

const pivotStub = () => ({
  removeUserTags: vi.fn().mockResolvedValue(undefined),
  removeRoleTags: vi.fn().mockResolvedValue(undefined),
  removeGroupTags: vi.fn().mockResolvedValue(undefined),
  removePermissionTags: vi.fn().mockResolvedValue(undefined),
  removeResourceTags: vi.fn().mockResolvedValue(undefined),
});

/** A cache `set` we can hold open, to prove the caller waits for it. */
function deferredSet() {
  let release!: () => void;
  let completed = false;
  const set = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = () => {
          completed = true;
          resolve();
        };
      })
  );
  return { set, release: () => release(), isCompleted: () => completed };
}

/** Flush pending microtasks so an un-awaited promise would have settled by now. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

function createHandler(tagsCache: Record<string, unknown>) {
  const pivots = pivotStub();
  const cache = {
    tags: tagsCache,
    roles: {},
    users: {},
    groups: {},
    permissions: {},
    resources: {},
    projects: {},
    projectApps: {},
    apiKeys: {},
  } as never;

  return new TagHandler(
    mockTags as never,
    {} as never,
    mockOrganizationTags as never,
    {} as never,
    pivots as never,
    pivots as never,
    pivots as never,
    pivots as never,
    pivots as never,
    cache,
    {} as never,
    { withTransaction: mockWithTransaction } as never
  );
}

describe('TagHandler scope-cache writes are awaited', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTags.createTag.mockResolvedValue(tagRow);
    mockTags.deleteTag.mockResolvedValue(tagRow);
  });

  it('createTag does not resolve until the cache write completes', async () => {
    const { set, release, isCompleted } = deferredSet();
    const handler = createHandler({
      has: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(new Set<string>()),
      set,
    });

    let settled = false;
    const pending = handler
      .createTag({ input: { name: 'Urgent', color: '#ff0000', scope } } as never)
      .then((tag) => {
        settled = true;
        return tag;
      });

    await flush();
    expect(set).toHaveBeenCalledWith(cacheKey, new Set([tagRow.id]));
    expect(isCompleted()).toBe(false);
    expect(settled).toBe(false);

    release();
    await expect(pending).resolves.toEqual(tagRow);
    expect(isCompleted()).toBe(true);
  });

  it('deleteTag does not resolve until the cache write completes', async () => {
    const { set, release, isCompleted } = deferredSet();
    const handler = createHandler({
      has: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(new Set([tagRow.id])),
      set,
    });

    let settled = false;
    const pending = handler
      .deleteTag({ id: tagRow.id, scope, hardDelete: false } as never)
      .then((tag) => {
        settled = true;
        return tag;
      });

    await flush();
    expect(set).toHaveBeenCalledWith(cacheKey, new Set<string>());
    expect(isCompleted()).toBe(false);
    expect(settled).toBe(false);

    release();
    await expect(pending).resolves.toEqual(tagRow);
    expect(isCompleted()).toBe(true);
  });

  it('propagates a cache-write failure instead of leaving it unhandled', async () => {
    const handler = createHandler({
      has: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(new Set<string>()),
      set: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    });

    await expect(
      handler.createTag({ input: { name: 'Urgent', color: '#ff0000', scope } } as never)
    ).rejects.toThrow('redis unavailable');
  });
});
