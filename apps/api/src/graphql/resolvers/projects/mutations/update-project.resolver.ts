import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateProjectResolver: MutationResolvers<GraphqlContext>['updateProject'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedProject = await context.handlers.projects.updateProject({ id, input });
  return updatedProject;
};
