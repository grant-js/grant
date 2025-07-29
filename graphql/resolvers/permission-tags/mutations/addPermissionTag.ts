import { MutationResolvers } from '@/graphql/generated/types';

export const addPermissionTagResolver: MutationResolvers['addPermissionTag'] = async (
  _parent,
  { input },
  context
) => {
  const addedPermissionTag = await context.providers.permissionTags.addPermissionTag({ input });
  return addedPermissionTag;
};
