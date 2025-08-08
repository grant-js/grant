import { ProjectResolvers, Tenant } from '@/graphql/generated/types';

export const projectTagsResolver: ProjectResolvers['tags'] = async (parent, _args, context) => {
  const projectId = parent.id;
  // Get project-tag relationships for this project
  const projectTags = await context.providers.projectTags.getProjectTags({ projectId });

  // Extract tag IDs from project-tag relationships
  const tagIds = projectTags.map((pt) => pt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  // Get tags by IDs (optimized - no need to fetch all tags)
  const tagsResult = await context.providers.tags.getTags({
    ids: tagIds,
    scope: {
      tenant: Tenant.Project,
      id: projectId,
    },
    limit: -1,
  });

  return tagsResult.tags;
};
