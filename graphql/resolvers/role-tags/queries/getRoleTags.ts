import { QueryResolvers } from '@/graphql/generated/types';

export const getRoleTagsResolver: QueryResolvers['roleTags'] = async (
  _parent,
  { roleId },
  context
) => {
  const roleTags = await context.providers.roleTags.getRoleTags({ roleId });
  return roleTags;
};
