import { ProjectAppResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * Resolves ProjectApp.tags scoped to the caller's tenant.
 *
 * Loads live project_app_tags pivots, then intersects with scoped getTags so
 * soft-deleted or out-of-scope tags never appear (including on non-CDM apps).
 */
export const projectAppTagsResolver: ProjectAppResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  if ((parent as { __scopedTagsHydrated?: boolean }).__scopedTagsHydrated && parent.tags) {
    return parent.tags;
  }

  const projectAppTags = await context.handlers.projectApps.getProjectAppTags({
    projectAppId: parent.id,
  });
  const tagIds = projectAppTags.map((pt) => pt.tagId);
  if (tagIds.length === 0) {
    return [];
  }

  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const { tags } = await context.handlers.tags.getTags({
    scope,
    ids: tagIds,
    limit: -1,
  });

  const isPrimaryByTagId = new Map(projectAppTags.map((pt) => [pt.tagId, pt.isPrimary]));
  return tags.map((t) => ({ ...t, isPrimary: isPrimaryByTagId.get(t.id) ?? false }));
};
