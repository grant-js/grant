import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createProjectResolver: MutationResolvers<GraphqlContext>['createProject'] = async (
  _parent,
  { input },
  context
) => {
  const createdProject = await context.handlers.projects.createProject({ input });
  return createdProject;
};
