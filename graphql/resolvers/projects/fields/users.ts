import { ProjectResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { UserModel } from '@/graphql/repositories/users/schema';

export const projectUsersResolver: ProjectResolvers['users'] = async (
  parent,
  _args,
  context,
  info
) => {
  const projectId = parent.id;
  const requestedFields = getDirectFieldSelection<keyof UserModel>(info);
  if (parent.users) {
    return parent.users;
  }

  return await context.controllers.projects.getProjectUsers(projectId, requestedFields);
};
