/**
 * Unit: entity `*.tags` field resolvers intersect pivot tag ids with
 * `tags.getTags({ scope, ids })` so only tags in the caller's scope are
 * returned (see .cursor/plans/cdm_identity_realignment_cfbfc658.plan.md).
 */
import { type Tag, Tenant, TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { groupTagsResolver } from '@/graphql/resolvers/groups/fields/tags.resolver';
import { permissionTagsResolver } from '@/graphql/resolvers/permissions/fields/tags.resolver';
import { resourceTagsResolver } from '@/graphql/resolvers/resources/fields/tags.resolver';
import { roleTagsResolver } from '@/graphql/resolvers/roles/fields/tags.resolver';
import { userTagsResolver } from '@/graphql/resolvers/users/fields/tags.resolver';
import type { GraphqlContext } from '@/graphql/types';

import { invokeFieldResolver } from '../../graphql-field-resolver-invoke';

const tagT1: Tag = {
  __typename: 'Tag',
  id: '10000000-0000-4000-8000-000000000001',
  name: 'tag-one',
  color: '#111111',
  metadata: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

const tagT2: Tag = {
  __typename: 'Tag',
  id: '20000000-0000-4000-8000-000000000002',
  name: 'tag-two',
  color: '#222222',
  metadata: {},
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  deletedAt: null,
};

const orgProjectScope = {
  tenant: Tenant.OrganizationProject,
  id: '00000000-0000-4000-8000-000000000010:00000000-0000-4000-8000-000000000011',
};

function tagPage(tags: Tag[]) {
  return { tags, totalCount: tags.length, hasNextPage: false, __typename: 'TagPage' as const };
}

describe('scoped entity tags field resolvers', () => {
  const getTags = vi.fn();

  const getUserTagPivots = vi.fn().mockResolvedValue([
    { tagId: tagT1.id, isPrimary: true },
    { tagId: tagT2.id, isPrimary: false },
  ]);
  const getRoleTagPivots = vi.fn().mockResolvedValue([
    { tagId: tagT1.id, isPrimary: true },
    { tagId: tagT2.id, isPrimary: false },
  ]);
  const getGroupTagPivots = vi.fn().mockResolvedValue([
    { tagId: tagT1.id, isPrimary: true },
    { tagId: tagT2.id, isPrimary: false },
  ]);
  const getResourceTagPivots = vi.fn().mockResolvedValue([
    { tagId: tagT1.id, isPrimary: true },
    { tagId: tagT2.id, isPrimary: false },
  ]);
  const getPermissionTagPivots = vi.fn().mockResolvedValue([
    { tagId: tagT1.id, isPrimary: true },
    { tagId: tagT2.id, isPrimary: false },
  ]);

  function baseContext(): GraphqlContext {
    return {
      user: {
        userId: 'u1',
        tokenId: 'tok',
        expiresAt: Date.now() + 60_000,
        type: TokenType.Session,
        scope: orgProjectScope,
      },
      handlers: {
        tags: { getTags },
        users: { getUserTagPivots },
        roles: { getRoleTagPivots },
        groups: { getGroupTagPivots },
        resources: { getResourceTagPivots },
        permissions: { getPermissionTagPivots },
      },
    } as unknown as GraphqlContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getTags.mockImplementation(async ({ ids }: { ids?: string[] | null }) => {
      const allowed = new Set([tagT2.id]);
      const filtered = (ids ?? [])
        .filter((id) => allowed.has(id))
        .map((id) => (id === tagT2.id ? tagT2 : null));
      return tagPage(filtered.filter(Boolean) as Tag[]);
    });
    getUserTagPivots.mockResolvedValue([
      { tagId: tagT1.id, isPrimary: true },
      { tagId: tagT2.id, isPrimary: false },
    ]);
    getRoleTagPivots.mockResolvedValue([
      { tagId: tagT1.id, isPrimary: true },
      { tagId: tagT2.id, isPrimary: false },
    ]);
    getGroupTagPivots.mockResolvedValue([
      { tagId: tagT1.id, isPrimary: true },
      { tagId: tagT2.id, isPrimary: false },
    ]);
    getResourceTagPivots.mockResolvedValue([
      { tagId: tagT1.id, isPrimary: true },
      { tagId: tagT2.id, isPrimary: false },
    ]);
    getPermissionTagPivots.mockResolvedValue([
      { tagId: tagT1.id, isPrimary: true },
      { tagId: tagT2.id, isPrimary: false },
    ]);
  });

  it('User.tags returns only in-scope tags and preserves isPrimary from pivot', async () => {
    const ctx = baseContext();
    const out = await invokeFieldResolver(userTagsResolver, { id: 'user-1' }, ctx);
    expect(out).toEqual([{ ...tagT2, isPrimary: false }]);
    expect(getUserTagPivots).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(getTags).toHaveBeenCalledWith({
      scope: orgProjectScope,
      ids: [tagT1.id, tagT2.id],
      limit: -1,
    });
  });

  it('Group.tags uses limit -1 when pivot count exceeds pagination max (101+ tags)', async () => {
    const manyPivots = Array.from({ length: 101 }, (_, i) => ({
      tagId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      isPrimary: i === 0,
    }));
    getGroupTagPivots.mockResolvedValueOnce(manyPivots);
    getTags.mockResolvedValueOnce(tagPage([]));
    const ctx = baseContext();
    await invokeFieldResolver(groupTagsResolver, { id: 'group-heavy' }, ctx);
    expect(getTags).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: orgProjectScope,
        limit: -1,
        ids: manyPivots.map((p) => p.tagId),
      })
    );
  });

  it('Role.tags returns only in-scope tags and preserves isPrimary from pivot', async () => {
    const ctx = baseContext();
    const out = await invokeFieldResolver(roleTagsResolver, { id: 'role-1' }, ctx);
    expect(out).toEqual([{ ...tagT2, isPrimary: false }]);
    expect(getRoleTagPivots).toHaveBeenCalledWith({ roleId: 'role-1' });
  });

  it('Group.tags returns only in-scope tags and preserves isPrimary from pivot', async () => {
    const ctx = baseContext();
    const out = await invokeFieldResolver(groupTagsResolver, { id: 'group-1' }, ctx);
    expect(out).toEqual([{ ...tagT2, isPrimary: false }]);
    expect(getGroupTagPivots).toHaveBeenCalledWith({ groupId: 'group-1' });
  });

  it('Resource.tags returns only in-scope tags and preserves isPrimary from pivot', async () => {
    const ctx = baseContext();
    const out = await invokeFieldResolver(resourceTagsResolver, { id: 'res-1' }, ctx);
    expect(out).toEqual([{ ...tagT2, isPrimary: false }]);
    expect(getResourceTagPivots).toHaveBeenCalledWith({ resourceId: 'res-1' });
  });

  it('Permission.tags returns only in-scope tags and preserves isPrimary from pivot', async () => {
    const ctx = baseContext();
    const out = await invokeFieldResolver(permissionTagsResolver, { id: 'perm-1' }, ctx);
    expect(out).toEqual([{ ...tagT2, isPrimary: false }]);
    expect(getPermissionTagPivots).toHaveBeenCalledWith({ permissionId: 'perm-1' });
  });

  it('returns [] when context has no scope', async () => {
    const ctx = {
      ...baseContext(),
      user: { ...baseContext().user!, scope: undefined },
    } as GraphqlContext;
    await expect(invokeFieldResolver(userTagsResolver, { id: 'user-1' }, ctx)).resolves.toEqual([]);
    expect(getUserTagPivots).not.toHaveBeenCalled();
    expect(getTags).not.toHaveBeenCalled();
  });

  it('returns [] when pivot list is empty', async () => {
    getUserTagPivots.mockResolvedValueOnce([]);
    const ctx = baseContext();
    await expect(invokeFieldResolver(userTagsResolver, { id: 'user-1' }, ctx)).resolves.toEqual([]);
    expect(getTags).not.toHaveBeenCalled();
  });

  it('returns [] when all pivot tags are out of scope (getTags filters to empty)', async () => {
    getTags.mockResolvedValueOnce(tagPage([]));
    const ctx = baseContext();
    await expect(invokeFieldResolver(userTagsResolver, { id: 'user-1' }, ctx)).resolves.toEqual([]);
  });
});
