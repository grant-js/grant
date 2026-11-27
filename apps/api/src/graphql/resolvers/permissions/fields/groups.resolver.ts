import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { GroupSortableField, PermissionResolvers, SortOrder } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

type PermissionGroupsResolver = NonNullable<PermissionResolvers<GraphqlContext>['groups']>;

/**
 * The groups holding the permission, narrowed to the caller's scope by the groups list, behind
 * the groups list's own check (`Group:Query`).
 */
const resolvePermissionGroups: PermissionGroupsResolver = async (parent, args, context, info) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.permissions.getPermissionGroupIds({
    permissionId: parent.id,
  });
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

export const permissionGroupsResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.Group, action: ResourceAction.Query },
  resolvePermissionGroups
) as PermissionGroupsResolver;
