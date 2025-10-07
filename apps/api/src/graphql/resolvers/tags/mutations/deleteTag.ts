import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteTagResolver: MutationResolvers<GraphqlContext>['deleteTag'] = async (
  _parent,
  { id, scope },
  context
) => {
  const deletedTag = await context.controllers.tags.deleteTag({ id, scope });
  return deletedTag;
};
