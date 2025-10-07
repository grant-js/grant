import { GroupResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const groupTagsResolver: GroupResolvers<GraphqlContext>['tags'] = async (
  parent,
  _args,
  context
) => {
  const groupId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.groups.getGroupTags({
    groupId,
    requestedFields: ['tags'],
  });
};
