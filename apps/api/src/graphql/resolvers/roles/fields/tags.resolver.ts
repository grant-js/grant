import { RoleResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * Resolves Role.tags scoped to the caller's tenant.
 *
 * Background: role_tags is a global pivot (no project column), so loading via
 * the `roles.tags` relation returns every tag the role has been linked to
 * across all projects. That leaks tags from project A when the caller is
 * operating under project B.
 *
 * Fix: load the raw role_tags pivot, then intersect with the scope's tag IDs
 * via tags.getTags({ scope, ids }). Mirrors the ProjectApp.tags pattern.
 */
export const roleTagsResolver: RoleResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  const roleId = parent.id;

  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const pivots = await context.handlers.roles.getRoleTagPivots({ roleId });
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
