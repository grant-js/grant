import { QueryResolvers } from '@/graphql/generated/types';

export const getRoleTagsResolver: QueryResolvers['roleTags'] = async (
  _parent,
  { roleId, scope },
  context
) => {
  const roleTags = await context.providers.roleTags.getRoleTags({
    roleId,
    scope,
  });
  return roleTags;
};
