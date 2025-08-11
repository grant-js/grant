import { MutationDeleteProjectArgs } from '@/graphql/generated/types';
import { deleteProject as deleteProjectInStore } from '@/graphql/providers/projects/faker/dataStore';

export async function deleteProject({ id }: MutationDeleteProjectArgs): Promise<boolean> {
  const projectData = deleteProjectInStore(id);
  if (!projectData) {
    throw new Error('Project not found');
  }
  return projectData !== null;
}
