import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteTagResolver: MutationResolvers<GraphqlContext>['deleteTag'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedTag = await context.handlers.tags.deleteTag({ id, scope });
  return deletedTag;
};
