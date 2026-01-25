import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createResourceResolver: MutationResolvers<GraphqlContext>['createResource'] = async (
  _parent,
  { input },
  context
) => {
  const createdResource = await context.handlers.resources.createResource({ input });
  return createdResource;
};
