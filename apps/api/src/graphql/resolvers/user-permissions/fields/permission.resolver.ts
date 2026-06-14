import { UserPermissionResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const userPermissionPermissionResolver: UserPermissionResolvers<GraphqlContext>['permission'] =
  async (parent, { scope }, context) => {
    if (parent.permission) {
      return parent.permission;
    }
    const page = await context.handlers.permissions.getPermissions({
      scope,
      ids: [parent.permissionId],
      limit: 1,
      requestedFields: ['id', 'name', 'action', 'resource'],
    });
    return page.permissions[0] ?? null;
  };
