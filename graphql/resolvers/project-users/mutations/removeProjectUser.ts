import { MutationResolvers } from '@/graphql/generated/types';

export const removeProjectUserResolver: MutationResolvers['removeProjectUser'] = async (
  _parent,
  { input },
  context
) => {
  const removedProjectUser = await context.providers.projectUsers.removeProjectUser({
    input,
  });
  return removedProjectUser;
};
