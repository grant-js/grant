import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createTagResolver: MutationResolvers<GraphqlContext>['createTag'] = async (
  _parent,
  { input },
  context
) => {
  const createdTag = await context.controllers.tags.createTag({ input });
  return createdTag;
};
