import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { PermissionResolvers, SortOrder, UserSortableField } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

type PermissionUsersResolver = NonNullable<PermissionResolvers<GraphqlContext>['users']>;

/**
 * The users holding the permission directly in the caller's scope, listed through the users
 * list, behind the users list's own check (`User:Query`).
 */
const resolvePermissionUsers: PermissionUsersResolver = async (parent, args, context, info) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.permissions.getPermissionUserIds({
    permissionId: parent.id,
    scope,
  });
  if (ids.length === 0) {
    return [];
  }

  const { users } = await context.handlers.users.getUsers({
    scope,
    ids,
    page: args.page,
    limit: args.limit,
    sort: { field: UserSortableField.Name, order: SortOrder.Asc },
    requestedFields: getDirectFieldSelection(info),
  });
  return users;
};

export const permissionUsersResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.User, action: ResourceAction.Query },
  resolvePermissionUsers
) as PermissionUsersResolver;
