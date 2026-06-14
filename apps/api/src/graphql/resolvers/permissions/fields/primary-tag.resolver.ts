import { PermissionResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { resolvePrimaryTagFromPivots } from '@/lib/graphql/primary-tag-resolver.lib';

export const permissionPrimaryTagResolver: PermissionResolvers<GraphqlContext>['primaryTag'] =
  async (parent, _args, context) => {
    const pivots = await context.handlers.permissions.getPermissionTagPivots({
      permissionId: parent.id,
    });
    return resolvePrimaryTagFromPivots(context, pivots);
  };

export const permissionTagCountResolver: PermissionResolvers<GraphqlContext>['tagCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.tagCount === 'number') {
    return parent.tagCount;
  }
  const pivots = await context.handlers.permissions.getPermissionTagPivots({
    permissionId: parent.id,
  });
  return pivots.length;
};
