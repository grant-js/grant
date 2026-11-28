import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { GroupResolvers, RoleSortableField, SortOrder } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { authorizeGraphQLResolver } from '@/lib/authorization';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

type GroupRolesResolver = NonNullable<GroupResolvers<GraphqlContext>['roles']>;

/**
 * The roles that include the group, narrowed to the caller's scope by the roles list, behind
 * the roles list's own check (`Role:Query`).
 */
const resolveGroupRoles: GroupRolesResolver = async (parent, args, context, info) => {
  const scope = context.user?.scope;
  if (!scope) {
    return [];
  }

  const ids = await context.handlers.groups.getGroupRoleIds({ groupId: parent.id });
  if (ids.length === 0) {
    return [];
  }

  const { roles } = await context.handlers.roles.getRoles({
    scope,
    ids,
    page: args.page,
    limit: args.limit,
    sort: { field: RoleSortableField.Name, order: SortOrder.Asc },
    requestedFields: getDirectFieldSelection(info),
  });
  return roles;
};

export const groupRolesResolver = authorizeGraphQLResolver(
  { resource: ResourceSlug.Role, action: ResourceAction.Query },
  resolveGroupRoles
) as GroupRolesResolver;
