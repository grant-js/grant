'use client';

import { useCallback } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import {
  GetGroupRelationsPreviewDocument,
  GetPermissionRelationsPreviewDocument,
  GetRoleRelationsPreviewDocument,
  GetUserRelationsPreviewDocument,
} from '@grantjs/schema';

import { useScopeFromParams } from './use-scope-from-params';

/** The relationships a list's count chips preview, per entity. */
export type RelationPreviewTarget =
  | { entity: 'user'; relation: 'roles' | 'groups' | 'permissions' | 'tags' }
  | { entity: 'role'; relation: 'groups' | 'users' | 'tags' }
  | { entity: 'group'; relation: 'permissions' | 'users' | 'roles' | 'tags' }
  | { entity: 'permission'; relation: 'groups' | 'users' | 'tags' };

interface RelationPreviewItem {
  id: string;
  name: string;
  /** Tags only. */
  color?: string | null;
  /** Users only: where their email comes from (see `getUserEmail`). */
  authenticationMethods?: ReadonlyArray<{ provider: string; providerId: string }> | null;
}

/** A user's direct group or permission: the pivot row, with the entity as the scope sees it. */
interface PivotRow {
  group?: { id: string; name: string } | null;
  permission?: { id: string; name: string } | null;
}

type Row = Partial<
  Record<'roles' | 'groups' | 'permissions' | 'users' | 'tags', RelationPreviewItem[] | null>
> &
  Partial<Record<'userGroups' | 'userPermissions', PivotRow[] | null>> &
  Partial<Record<'groupCount' | 'userCount', number | null>>;

const DOCUMENTS = {
  user: { document: GetUserRelationsPreviewDocument, list: 'users' },
  role: { document: GetRoleRelationsPreviewDocument, list: 'roles' },
  group: { document: GetGroupRelationsPreviewDocument, list: 'groups' },
  permission: { document: GetPermissionRelationsPreviewDocument, list: 'permissions' },
} as const;

/** The `@include` flags of each document: only the previewed relationship is selected. */
function flagsFor(target: RelationPreviewTarget): Record<string, boolean> {
  switch (target.entity) {
    case 'user':
      return {
        withRoles: target.relation === 'roles',
        withGroups: target.relation === 'groups',
        withPermissions: target.relation === 'permissions',
        withTags: target.relation === 'tags',
      };
    case 'role':
      return {
        withGroups: target.relation === 'groups',
        withUsers: target.relation === 'users',
        withTags: target.relation === 'tags',
      };
    case 'group':
      return {
        withPermissions: target.relation === 'permissions',
        withUsers: target.relation === 'users',
        withRoles: target.relation === 'roles',
        withTags: target.relation === 'tags',
      };
    case 'permission':
      return {
        withGroups: target.relation === 'groups',
        withUsers: target.relation === 'users',
        withTags: target.relation === 'tags',
      };
  }
}

/**
 * The items a previewed relationship lists. A user's groups and permissions come as pivot rows
 * (`User.userGroups`, `User.userPermissions`: there is no `User.groups` to list them by), each
 * naming the entity as the request's scope sees it; a row whose entity is not in the scope has
 * none and is dropped, as it is not counted either.
 */
function itemsOf(row: Row, target: RelationPreviewTarget): RelationPreviewItem[] {
  if (target.entity === 'user' && target.relation === 'groups') {
    return pivotItems(row.userGroups, 'group');
  }
  if (target.entity === 'user' && target.relation === 'permissions') {
    return pivotItems(row.userPermissions, 'permission');
  }
  return row[target.relation as keyof Row & RelationPreviewTarget['relation']] ?? [];
}

function pivotItems(
  pivots: PivotRow[] | null | undefined,
  entity: 'group' | 'permission'
): RelationPreviewItem[] {
  return (pivots ?? []).flatMap((pivot) => {
    const item = pivot[entity];
    return item ? [{ id: item.id, name: item.name }] : [];
  });
}

/**
 * One entity's relationship, fetched on demand for a count chip's preview (`load`). Nothing
 * is fetched until `load` is called, and the result stays with the chip: `no-cache` keeps it
 * out of the normalized cache. Written there, it would add the relationship to the cached
 * User/Role/Group, every list query watching that entity would re-emit, and the whole list
 * would re-render on each hover. It also keeps one scope's answer from showing in another
 * (the cache keys an entity by id alone).
 */
export function useRelationPreview(target: RelationPreviewTarget, entityId: string) {
  const scope = useScopeFromParams();
  const { document, list } = DOCUMENTS[target.entity];
  const [run, { data, loading, error, called }] = useLazyQuery<
    Record<string, Record<string, Row[]>>
  >(document as never, { fetchPolicy: 'no-cache' });

  const load = useCallback(() => {
    if (!scope) return;
    void run({ variables: { scope, id: entityId, ...flagsFor(target) } }).catch(() => undefined);
    // target is a literal object per call site; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, scope, entityId, target.entity, target.relation]);

  const row = data?.[list]?.[list]?.[0];
  const items: RelationPreviewItem[] | undefined = row ? itemsOf(row, target) : undefined;

  return { load, items, loading, error: Boolean(error) || (called && !loading && !scope), called };
}

/** The relationships a detail page lists in a read-only card, a page at a time. */
export type RelationPageTarget =
  { entity: 'group'; relation: 'users' } | { entity: 'permission'; relation: 'groups' | 'users' };

const COUNT_FIELD = { groups: 'groupCount', users: 'userCount' } as const;

/**
 * One page of an entity's relationship for its detail page, from the same documents as the
 * count chips' previews; `totalCount` is the relationship's count. Like the preview it stays out
 * of the normalized cache, so it is fetched again when the page is opened.
 */
export function useRelationPage(
  target: RelationPageTarget,
  entityId: string,
  { page, limit }: { page: number; limit: number }
) {
  const scope = useScopeFromParams();
  const { document, list } = DOCUMENTS[target.entity];
  const { data, loading, error } = useQuery<Record<string, Record<string, Row[]>>>(
    document as never,
    {
      variables: { scope, id: entityId, page, limit, ...flagsFor(target) },
      skip: !scope,
      fetchPolicy: 'no-cache',
    }
  );

  const row = data?.[list]?.[list]?.[0];
  return {
    items: row ? itemsOf(row, target) : undefined,
    totalCount: row?.[COUNT_FIELD[target.relation]] ?? 0,
    loading,
    error: Boolean(error) || !scope,
  };
}
