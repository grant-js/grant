import { UserTagResolvers } from '@/graphql/generated/types';

export const userTagUserResolver: UserTagResolvers['user'] = async (parent, { scope }, context) => {
  const usersResult = await context.providers.users.getUsers({
    ids: [parent.userId],
    scope,
  });

  const user = usersResult.users[0];

  if (!user) {
    throw new Error(`User with ID ${parent.userId} not found`);
  }

  return user;
};
