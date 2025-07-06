import { MutationResolvers } from '@/graphql/generated/types';

export const createPermissionResolver: MutationResolvers['createPermission'] = async (
  _parent,
  { input },
  context
) => {
  const createdPermission = await context.providers.permissions.createPermission({ input });
  return createdPermission;
};
