import { MutationResolvers } from '@/graphql/generated/types';

export const updateProjectResolver: MutationResolvers['updateProject'] = async (
  _parent,
  { id, input },
  context
) => {
  const updatedProject = await context.providers.projects.updateProject({
    id,
    input,
  });
  return updatedProject;
};
