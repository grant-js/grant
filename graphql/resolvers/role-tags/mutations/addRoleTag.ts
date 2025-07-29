import { MutationResolvers } from '@/graphql/generated/types';

export const addRoleTagResolver: MutationResolvers['addRoleTag'] = async (
  _parent,
  { input },
  context
) => {
  const addedRoleTag = await context.providers.roleTags.addRoleTag({ input });
  return addedRoleTag;
};
