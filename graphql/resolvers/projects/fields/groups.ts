import { ProjectResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { GroupModel } from '@/graphql/repositories/groups/schema';

export const projectGroupsResolver: ProjectResolvers['groups'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = getDirectFieldSelection<keyof GroupModel>(info);
  if (parent.groups) {
    return parent.groups;
  }
  return await context.controllers.projects.getProjectGroups(projectId, requestedFields);
};
