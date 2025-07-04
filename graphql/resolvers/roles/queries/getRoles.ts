import { QueryResolvers } from '@/graphql/generated/types';

export const getRolesResolver: QueryResolvers['roles'] = async (
  _parent,
  { page = 1, limit = 10, sort, search },
  context
) => {
  const roles = await context.providers.roles.getRoles({ limit, page, sort, search });
  return roles;
};
