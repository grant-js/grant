import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { RoleResolvers, SortOrder, UserSortableField } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

type RoleUsersResolver = NonNullable<RoleResolvers<GraphqlContext>['users']>;

/**
 * The users the role is directly assigned to in the caller's scope, listed through the users
 * list (scope, project display names, paging), behind the users list's own check (`User:Query`).
 */
const resolveRoleUsers: RoleUsersResolver = async (parent, args, context, info) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.roles.getRoleUserIds({ roleId: parent.id, scope });
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

export const roleUsersResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.User, action: ResourceAction.Query },
  resolveRoleUsers
) as RoleUsersResolver;
