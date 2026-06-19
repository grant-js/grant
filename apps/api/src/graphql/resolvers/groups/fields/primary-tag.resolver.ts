import { GroupResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { resolvePrimaryTagFromPivots } from '@/lib/graphql/primary-tag-resolver.lib';

export const groupPrimaryTagResolver: GroupResolvers<GraphqlContext>['primaryTag'] = async (
  parent,
  _args,
  context
) => {
  if ((parent as { __scopedTagsHydrated?: boolean }).__scopedTagsHydrated) {
    return parent.primaryTag ?? null;
  }

  const pivots = await context.handlers.groups.getGroupTagPivots({ groupId: parent.id });
  return resolvePrimaryTagFromPivots(context, pivots);
};

export const groupPermissionCountResolver: GroupResolvers<GraphqlContext>['permissionCount'] =
  async (parent, _args, context) => {
    if (typeof parent.permissionCount === 'number') {
      return parent.permissionCount;
    }
    return context.handlers.groups.countGroupPermissions({ groupId: parent.id });
  };

export const groupTagCountResolver: GroupResolvers<GraphqlContext>['tagCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.tagCount === 'number') {
    return parent.tagCount;
  }
  const pivots = await context.handlers.groups.getGroupTagPivots({ groupId: parent.id });
  return pivots.length;
};
