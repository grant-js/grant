import type { Tag } from '@grantjs/schema';

import type { GraphqlContext } from '@/graphql/types';

type TagPivot = { tagId: string; isPrimary: boolean };

export async function resolvePrimaryTagFromPivots(
  context: GraphqlContext,
  pivots: TagPivot[]
): Promise<Tag | null> {
  const scope = context.user?.scope;
  if (!scope || pivots.length === 0) {
    return null;
  }

  const primaryPivot =
    pivots.find((p) => p.isPrimary) ?? (pivots.length === 1 ? pivots[0] : undefined);
  if (!primaryPivot) {
    return null;
  }

  const { tags } = await context.handlers.tags.getTags({
    scope,
    ids: [primaryPivot.tagId],
    limit: 1,
  });

  const tag = tags[0];
  if (!tag) {
    return null;
  }

  return { ...tag, isPrimary: true };
}
