import { MutationResolvers } from '@/graphql/generated/types';

export const removeProjectRoleResolver: MutationResolvers['removeProjectRole'] = async (
  _parent,
  { input },
  context
) => {
  const removedProjectRole = await context.providers.projectRoles.removeProjectRole({
    input,
  });
  return removedProjectRole;
};
