import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteProjectResolver: MutationResolvers<GraphqlContext>['deleteProject'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedProject = await context.controllers.projects.deleteProject({ id, scope });
  return deletedProject;
};
