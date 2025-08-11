import { MutationUpdateProjectArgs, Project } from '@/graphql/generated/types';
import { updateProject as updateProjectInStore } from '@/graphql/providers/projects/faker/dataStore';

export async function updateProject({ id, input }: MutationUpdateProjectArgs): Promise<Project> {
  const projectData = updateProjectInStore(id, input);
  if (!projectData) {
    throw new Error('Project not found');
  }
  return projectData;
}
