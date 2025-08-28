import { ProjectResolvers, Tenant } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedTagIds } from '@/graphql/lib/scopeFiltering';

export const projectTagsResolver: ProjectResolvers['tags'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const projectTags = await context.services.projectTags.getProjectTags({ projectId });

  const tagIds = projectTags.map((pt) => pt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  const scope = { tenant: Tenant.Project, id: projectId };
  const scopedTagIds = await getScopedTagIds({ scope, context });

  const filteredTagIds = tagIds.filter((tagId) => scopedTagIds.includes(tagId));

  if (filteredTagIds.length === 0) {
    return [];
  }

  const tagsResult = await context.services.tags.getTags({
    ids: filteredTagIds,
    limit: -1,
    requestedFields,
  });

  return tagsResult.tags;
};
