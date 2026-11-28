'use client';

import { useCallback } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import {
  GetGroupRelationsPreviewDocument,
  GetPermissionRelationsPreviewDocument,
  GetRoleRelationsPreviewDocument,
  GetUserRelationsPreviewDocument,
} from '@grantjs/schema';

import { useScopeFromParams } from './use-scope-from-params';

/** The relationships a list's count chips preview, per entity. */
export type RelationPreviewTarget =
  | { entity: 'user'; relation: 'roles' | 'tags' }
  | { entity: 'role'; relation: 'groups' | 'tags' }
  | { entity: 'group'; relation: 'permissions' | 'users' | 'tags' }
  | { entity: 'permission'; relation: 'groups' | 'users' | 'tags' };

interface RelationPreviewItem {
  id: string;
  name: string;
  /** Tags only. */
  color?: string | null;
}

type Row = Partial<
  Record<'roles' | 'groups' | 'permissions' | 'users' | 'tags', RelationPreviewItem[] | null>
>;

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
      return { withRoles: target.relation === 'roles', withTags: target.relation === 'tags' };
    case 'role':
      return { withGroups: target.relation === 'groups', withTags: target.relation === 'tags' };
    case 'group':
      return {
        withPermissions: target.relation === 'permissions',
        withUsers: target.relation === 'users',
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
  const items: RelationPreviewItem[] | undefined = row ? (row[target.relation] ?? []) : undefined;

  return { load, items, loading, error: Boolean(error) || (called && !loading && !scope), called };
}
