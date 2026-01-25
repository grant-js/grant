import { GroupResolvers } from '@grantjs/schema';

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

  return await context.handlers.groups.getGroupTags({
    groupId,
    requestedFields: ['tags'],
  });
};
