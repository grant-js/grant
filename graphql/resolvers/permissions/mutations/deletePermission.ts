import { MutationResolvers } from '@/graphql/generated/types';

export const deletePermissionResolver: MutationResolvers['deletePermission'] = async (
  _parent,
  { id },
  context
) => {
  const deletedPermission = await context.providers.permissions.deletePermission({ id });
  return deletedPermission;
};
