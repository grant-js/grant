import { ProjectResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { TagModel } from '@/graphql/repositories/tags/schema';

export const projectTagsResolver: ProjectResolvers['tags'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = getDirectFieldSelection<keyof TagModel>(info);
  if (parent.tags) {
    return parent.tags;
  }
  return await context.controllers.projects.getProjectTags(projectId, requestedFields);
};
