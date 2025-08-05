import { MutationResolvers } from '@/graphql/generated/types';

export const createProjectResolver: MutationResolvers['createProject'] = async (
  _parent,
  { input },
  context
) => {
  const createdProject = await context.providers.projects.createProject({ input });
  return createdProject;
};
