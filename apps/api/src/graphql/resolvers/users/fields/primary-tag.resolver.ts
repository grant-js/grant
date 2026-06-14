import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { resolvePrimaryTagFromPivots } from '@/lib/graphql/primary-tag-resolver.lib';

export const userPrimaryTagResolver: UserResolvers<GraphqlContext>['primaryTag'] = async (
  parent,
  _args,
  context
) => {
  const pivots = await context.handlers.users.getUserTagPivots({ userId: parent.id });
  return resolvePrimaryTagFromPivots(context, pivots);
};

export const userRoleCountResolver: UserResolvers<GraphqlContext>['roleCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.roleCount === 'number') {
    return parent.roleCount;
  }
  return context.handlers.users.countUserRoles({ userId: parent.id });
};

export const userPermissionCountResolver: UserResolvers<GraphqlContext>['permissionCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.permissionCount === 'number') {
    return parent.permissionCount;
  }
  return context.handlers.users.countUserPermissions({ userId: parent.id });
};

export const userProjectUserApiKeyCountResolver: UserResolvers<GraphqlContext>['projectUserApiKeyCount'] =
  async (parent, _args, context) => {
    if (typeof parent.projectUserApiKeyCount === 'number') {
      return parent.projectUserApiKeyCount;
    }
    const scope = context.user?.scope;
    if (!scope) {
      return 0;
    }
    return context.handlers.users.countProjectUserApiKeys({ userId: parent.id, scope });
  };

export const userTagCountResolver: UserResolvers<GraphqlContext>['tagCount'] = async (
  parent,
  _args,
  context
) => {
  if (typeof parent.tagCount === 'number') {
    return parent.tagCount;
  }
  const pivots = await context.handlers.users.getUserTagPivots({ userId: parent.id });
  return pivots.length;
};
