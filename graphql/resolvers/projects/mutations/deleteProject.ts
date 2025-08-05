import { MutationResolvers } from '@/graphql/generated/types';

export const deleteProjectResolver: MutationResolvers['deleteProject'] = async (
  _parent,
  { id },
  context
) => {
  const deleted = await context.providers.projects.deleteProject({ id });
  return deleted;
};
