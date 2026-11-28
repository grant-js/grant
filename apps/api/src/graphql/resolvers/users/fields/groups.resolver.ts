import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { GroupSortableField, SortOrder, UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const userGroupsResolver: UserResolvers<GraphqlContext>['userGroups'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;

  if (parent.userGroups) {
    return parent.userGroups;
  }

  return await context.handlers.users.getUserGroups({ userId });
};

type UserGroupsListResolver = NonNullable<UserResolvers<GraphqlContext>['groups']>;

/**
 * The user's direct groups, narrowed to the caller's scope by the groups list, behind the
 * groups list's own check (`Group:Query`).
 */
const resolveUserGroupsList: UserGroupsListResolver = async (parent, args, context, info) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.users.getUserGroupIds({ userId: parent.id });
  if (ids.length === 0) {
    return [];
  }

  const { groups } = await context.handlers.groups.getGroups({
    scope,
    ids,
    page: args.page,
    limit: args.limit,
    sort: { field: GroupSortableField.Name, order: SortOrder.Asc },
    requestedFields: getDirectFieldSelection(info),
  });
  return groups;
};

export const userGroupsListResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.Group, action: ResourceAction.Query },
  resolveUserGroupsList
) as UserGroupsListResolver;
