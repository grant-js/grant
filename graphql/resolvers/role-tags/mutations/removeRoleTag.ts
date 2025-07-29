import { MutationResolvers } from '@/graphql/generated/types';

export const removeRoleTagResolver: MutationResolvers['removeRoleTag'] = async (
  _parent,
  { input },
  context
) => {
  await context.providers.roleTags.removeRoleTag({ input });
  return true;
};
