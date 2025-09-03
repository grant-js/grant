import { QueryResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { RoleModel } from '@/graphql/repositories/roles/schema';

export const getRolesResolver: QueryResolvers['roles'] = async (
  _parent,
  { scope, page, limit, sort, search, ids, tagIds },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof RoleModel>(info, ['roles']);

  const roles = await context.controllers.roles.getRoles({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    tagIds,
    requestedFields,
  });

  return roles;
};
