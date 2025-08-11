import { MutationResolvers } from '@/graphql/generated/types';

export const removePermissionTagResolver: MutationResolvers['removePermissionTag'] = async (
  _parent,
  { input },
  context
) => {
  const removedPermissionTag = await context.providers.permissionTags.removePermissionTag({
    input,
  });
  return removedPermissionTag;
};
