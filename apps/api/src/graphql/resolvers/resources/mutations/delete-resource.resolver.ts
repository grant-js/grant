import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteResourceResolver: MutationResolvers<GraphqlContext>['deleteResource'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedResource = await context.handlers.resources.deleteResource({ id, scope });
  return deletedResource;
};
