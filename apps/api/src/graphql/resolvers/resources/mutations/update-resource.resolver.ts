import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateResourceResolver: MutationResolvers<GraphqlContext>['updateResource'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedResource = await context.handlers.resources.updateResource({ id, input });
  return updatedResource;
};
