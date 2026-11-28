import { PermissionResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { resolvePrimaryTagFromPivots } from '@/lib/graphql/primary-tag-resolver.lib';

export const permissionPrimaryTagResolver: PermissionResolvers<GraphqlContext>['primaryTag'] =
  async (parent, _args, context) => {
    if ((parent as { __scopedTagsHydrated?: boolean }).__scopedTagsHydrated) {
      return parent.primaryTag ?? null;
    }

    const pivots = await context.handlers.permissions.getPermissionTagPivots({
      permissionId: parent.id,
    });
    return resolvePrimaryTagFromPivots(context, pivots);
  };

export const permissionGroupCountResolver: PermissionResolvers<GraphqlContext>['groupCount'] =
  async (parent, _args, context) => {
    if (typeof parent.groupCount === 'number') {
      return parent.groupCount;
    }
    const scope = context.user?.scope;
    if (!scope) {
      return 0;
    }
    return context.handlers.permissions.countPermissionGroups({ permissionId: parent.id, scope });
  };

export const permissionUserCountResolver: PermissionResolvers<GraphqlContext>['userCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.userCount === 'number') {
    return parent.userCount;
  }
  const scope = context.user?.scope;
  if (!scope) {
    return 0;
  }
  return context.handlers.permissions.countPermissionUsers({ permissionId: parent.id, scope });
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
