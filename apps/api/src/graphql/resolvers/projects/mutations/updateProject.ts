import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const updateProjectResolver: MutationResolvers<GraphqlContext>['updateProject'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedProject = await context.controllers.projects.updateProject({ id, input });
  return updatedProject;
};
