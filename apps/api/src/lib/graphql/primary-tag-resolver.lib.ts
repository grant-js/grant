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

  let resolvedTag: Tag | undefined = tags[0];
  if (!resolvedTag) {
    const primaryPivots = pivots.filter((p) => p.isPrimary);
    const scopedCandidates = primaryPivots.length > 0 ? primaryPivots : [primaryPivot];
    const { tags: scopedTags } = await context.handlers.tags.getTags({
      scope,
      ids: scopedCandidates.map((p) => p.tagId),
      limit: -1,
    });
    const scopedTagById = new Map(scopedTags.map((candidate) => [candidate.id, candidate]));
    resolvedTag = scopedCandidates
      .map((p) => scopedTagById.get(p.tagId))
      .find((candidate): candidate is Tag => candidate != null);
  }

  if (!resolvedTag) {
    return null;
  }

  return { ...resolvedTag, isPrimary: true };
}
