import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createTagResolver: MutationResolvers<GraphqlContext>['createTag'] = async (
  _parent,
  { input },
  context
) => {
  const createdTag = await context.handlers.tags.createTag({ input });
  return createdTag;
};
