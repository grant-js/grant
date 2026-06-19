import { PermissionResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * Resolves Permission.tags scoped to the caller's tenant.
 *
 * Background: permission_tags is a global pivot (no project column), so
 * loading via the `permissions.tags` relation returns every tag the
 * permission has been linked to across all projects. That leaks tags from
 * project A when the caller is operating under project B.
 *
 * Fix: load the raw permission_tags pivot, then intersect with the scope's
 * tag IDs via tags.getTags({ scope, ids }). Mirrors the ProjectApp.tags
 * pattern.
 */
export const permissionTagsResolver: PermissionResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  const permissionId = parent.id;

  if ((parent as { __scopedTagsHydrated?: boolean }).__scopedTagsHydrated && parent.tags) {
    return parent.tags;
  }

  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const pivots = await context.handlers.permissions.getPermissionTagPivots({ permissionId });
  if (pivots.length === 0) {
    return [];
  }

  const ids = pivots.map((p) => p.tagId);
  const { tags } = await context.handlers.tags.getTags({
    scope,
    ids,
    limit: -1,
  });

  const isPrimaryByTagId = new Map(pivots.map((p) => [p.tagId, p.isPrimary]));
  return tags.map((t) => ({ ...t, isPrimary: isPrimaryByTagId.get(t.id) ?? false }));
};
