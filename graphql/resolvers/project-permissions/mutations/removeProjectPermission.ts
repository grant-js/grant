import { MutationResolvers } from '@/graphql/generated/types';

export const removeProjectPermissionResolver: MutationResolvers['removeProjectPermission'] = async (
  _parent,
  { input },
  context
) => {
  const removedProjectPermission =
    await context.providers.projectPermissions.removeProjectPermission({
      input,
    });
  return removedProjectPermission;
};
