import { QueryResolvers } from '@/graphql/generated/types';

export const getUsersResolver: QueryResolvers['users'] = async (
  _parent,
  { page = 1, limit = 10, sort, search },
  context
) => {
  const users = await context.providers.users.getUsers({ limit, page, sort, search });
  return users;
};
