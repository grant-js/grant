import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * Resolves User.tags scoped to the caller's tenant.
 *
 * Background: user_tags is a global pivot (no project column), so loading the
 * user's tags via the `users.tags` relation returns every tag the user has
 * been linked to across all projects. That leaks tags from project A when the
 * caller is operating under project B.
 *
 * Fix: load the raw user_tags pivot, then intersect with the scope's tag IDs
 * via tags.getTags({ scope, ids }). Mirrors the ProjectApp.tags pattern.
 */
export const userTagsResolver: UserResolvers<GraphqlContext>['tags'] = async (
  _parent,
  _args,
  context
) => {
  const userId = _parent.id;

  if ((_parent as { __scopedTagsHydrated?: boolean }).__scopedTagsHydrated && _parent.tags) {
    return _parent.tags;
  }

  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const pivots = await context.handlers.users.getUserTagPivots({ userId });
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
