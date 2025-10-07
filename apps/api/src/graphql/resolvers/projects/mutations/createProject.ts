import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createProjectResolver: MutationResolvers<GraphqlContext>['createProject'] = async (
  _parent,
  { input },
  context
) => {
  const createdProject = await context.controllers.projects.createProject({ input });
  return createdProject;
};
