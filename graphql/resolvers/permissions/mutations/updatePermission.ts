import { MutationResolvers } from '@/graphql/generated/types';

export const updatePermissionResolver: MutationResolvers['updatePermission'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedPermission = await context.providers.permissions.updatePermission({ id, input });
  return updatedPermission;
};
