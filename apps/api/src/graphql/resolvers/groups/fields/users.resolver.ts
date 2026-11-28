import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { GroupResolvers, SortOrder, UserSortableField } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

type GroupUsersResolver = NonNullable<GroupResolvers<GraphqlContext>['users']>;

/**
 * The group's direct members in the caller's scope, listed through the users list (scope,
 * project display names, paging), behind the users list's own check (`User:Query`).
 */
const resolveGroupUsers: GroupUsersResolver = async (parent, args, context, info) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.groups.getGroupUserIds({ groupId: parent.id, scope });
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

export const groupUsersResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.User, action: ResourceAction.Query },
  resolveGroupUsers
) as GroupUsersResolver;
