import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const updateTagResolver: MutationResolvers<GraphqlContext>['updateTag'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedTag = await context.controllers.tags.updateTag({ id, input });
  return updatedTag;
};
