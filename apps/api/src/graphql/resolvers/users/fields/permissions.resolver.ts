import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { PermissionSortableField, SortOrder, UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const userPermissionsResolver: UserResolvers<GraphqlContext>['userPermissions'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;

  if (parent.userPermissions) {
    return parent.userPermissions;
  }

  return await context.handlers.users.getUserPermissions({ userId });
};

type UserPermissionsListResolver = NonNullable<UserResolvers<GraphqlContext>['permissions']>;

/**
 * The user's direct permissions, narrowed to the caller's scope by the permissions list, behind the
 * permissions list's own check (`Permission:Query`).
 */
const resolveUserPermissionsList: UserPermissionsListResolver = async (
  parent,
  args,
  context,
  info
) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.users.getUserPermissionIds({ userId: parent.id });
  if (ids.length === 0) {
    return [];
  }

  const { permissions } = await context.handlers.permissions.getPermissions({
    scope,
    ids,
    page: args.page,
    limit: args.limit,
    sort: { field: PermissionSortableField.Name, order: SortOrder.Asc },
    requestedFields: getDirectFieldSelection(info),
  });
  return permissions;
};

export const userPermissionsListResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.Permission, action: ResourceAction.Query },
  resolveUserPermissionsList
) as UserPermissionsListResolver;
