import { MutationResolvers } from '@/graphql/generated/types';

export const removePermissionTagResolver: MutationResolvers['removePermissionTag'] = async (
  _parent,
  { input },
  context
) => {
  await context.providers.permissionTags.removePermissionTag({ input });
  return true;
};
