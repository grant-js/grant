import { UserResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const userTagsResolver: UserResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.users.getUserTags({
    userId,
    requestedFields: ['tags'],
  });
};
