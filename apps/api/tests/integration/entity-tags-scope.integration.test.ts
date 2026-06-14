/**
 * Integration-style: same user sees different tags under different project scopes
 * when pivots span both projects' tag rows — `tags.getTags` is the scope gate
 * (mirrors project_tags membership via getScopedTagIds in the handler).
 *
 * Also asserts ProjectApp.tags loads pivots + scoped getTags (ignores preloaded parent.tags).
 */
import { type Tag, Tenant, TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectAppTagsResolver } from '@/graphql/resolvers/project-apps/fields/tags.resolver';
import { userTagsResolver } from '@/graphql/resolvers/users/fields/tags.resolver';
import type { GraphqlContext } from '@/graphql/types';

import {
  invokeFieldResolver,
  invokeProjectAppTagsResolver,
} from '../graphql-field-resolver-invoke';

const tagProjectA: Tag = {
  __typename: 'Tag',
  id: 'aaaaaaaa-aaaa-4000-8000-000000000001',
  name: 'project-a-tag',
  color: '#aaaaaa',
  metadata: {},
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  deletedAt: null,
};

const tagProjectB: Tag = {
  __typename: 'Tag',
  id: 'bbbbbbbb-bbbb-4000-8000-000000000002',
  name: 'project-b-tag',
  color: '#bbbbbb',
  metadata: {},
  createdAt: new Date('2026-03-02T00:00:00.000Z'),
  updatedAt: new Date('2026-03-02T00:00:00.000Z'),
  deletedAt: null,
};

const scopeA = {
  tenant: Tenant.OrganizationProject,
  id: 'org-1:proj-a',
};

const scopeB = {
  tenant: Tenant.OrganizationProject,
  id: 'org-1:proj-b',
};

function tagPage(tags: Tag[]) {
  return { tags, totalCount: tags.length, hasNextPage: false, __typename: 'TagPage' as const };
}

describe('entity tags scope (cross-project leak regression)', () => {
  const getUserTagPivots = vi.fn();
  const getTags = vi.fn();
  const getProjectAppTags = vi.fn();

  function ctxForScope(scope: typeof scopeA): GraphqlContext {
    return {
      user: {
        userId: 'shared-user',
        tokenId: 'tok',
        expiresAt: Date.now() + 60_000,
        type: TokenType.Session,
        scope,
      },
      handlers: {
        tags: { getTags },
        users: { getUserTagPivots },
        projectApps: { getProjectAppTags },
      },
    } as unknown as GraphqlContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Same user linked to two tag rows (global user_tags pivot — pre-fix would leak both).
    getUserTagPivots.mockResolvedValue([
      { tagId: tagProjectA.id, isPrimary: true },
      { tagId: tagProjectB.id, isPrimary: false },
    ]);

    getTags.mockImplementation(
      async ({ scope, ids }: { scope: { id: string }; ids?: string[] | null }) => {
        const idSet = new Set(ids ?? []);
        if (scope.id === scopeA.id) {
          const tags = idSet.has(tagProjectA.id) ? [tagProjectA] : [];
          return tagPage(tags);
        }
        if (scope.id === scopeB.id) {
          const tags = idSet.has(tagProjectB.id) ? [tagProjectB] : [];
          return tagPage(tags);
        }
        return tagPage([]);
      }
    );
  });

  it('User.tags under project A returns only project A tag', async () => {
    const out = await invokeFieldResolver(
      userTagsResolver,
      { id: 'shared-user' },
      ctxForScope(scopeA)
    );
    expect(out).toEqual([{ ...tagProjectA, isPrimary: true }]);
    expect(getTags).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: scopeA,
        ids: [tagProjectA.id, tagProjectB.id],
        limit: -1,
      })
    );
  });

  it('User.tags under project B returns only project B tag', async () => {
    const out = await invokeFieldResolver(
      userTagsResolver,
      { id: 'shared-user' },
      ctxForScope(scopeB)
    );
    expect(out).toEqual([{ ...tagProjectB, isPrimary: false }]);
    expect(getTags).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: scopeB,
        ids: [tagProjectA.id, tagProjectB.id],
        limit: -1,
      })
    );
  });

  it('ProjectApp.tags still resolves via project-app pivots + scoped getTags', async () => {
    getProjectAppTags.mockResolvedValue([{ tagId: tagProjectA.id, isPrimary: true }]);
    const getTagsApp = vi.fn().mockResolvedValue(tagPage([tagProjectA]));
    const ctx = {
      user: {
        userId: 'u1',
        tokenId: 'tok',
        expiresAt: Date.now() + 60_000,
        type: TokenType.Session,
        scope: scopeA,
      },
      handlers: {
        tags: { getTags: getTagsApp },
        projectApps: { getProjectAppTags },
      },
    } as unknown as GraphqlContext;

    const out = await invokeProjectAppTagsResolver(
      projectAppTagsResolver,
      {
        id: 'pa-1',
        tags: [{ ...tagProjectB, isPrimary: true }],
      },
      ctx
    );
    expect(out).toEqual([{ ...tagProjectA, isPrimary: true }]);
    expect(getProjectAppTags).toHaveBeenCalledWith({ projectAppId: 'pa-1' });
    expect(getTagsApp).toHaveBeenCalledWith({
      scope: scopeA,
      ids: [tagProjectA.id],
      limit: -1,
    });
  });
});
