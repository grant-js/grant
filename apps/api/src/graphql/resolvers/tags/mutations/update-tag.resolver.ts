import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateTagResolver: MutationResolvers<GraphqlContext>['updateTag'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedTag = await context.handlers.tags.updateTag({ id, input });
  return updatedTag;
};
