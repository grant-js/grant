import { MutationDeleteProjectArgs, Project } from '@/graphql/generated/types';
import { deleteProject as deleteProjectInStore } from '@/graphql/providers/projects/faker/dataStore';

export async function deleteProject({ id }: MutationDeleteProjectArgs): Promise<Project> {
  const projectData = deleteProjectInStore(id);
  if (!projectData) {
    throw new Error('Project not found');
  }
  return projectData;
}
