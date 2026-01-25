import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteProjectResolver: MutationResolvers<GraphqlContext>['deleteProject'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedProject = await context.handlers.projects.deleteProject({ id, scope });
  return deletedProject;
};
