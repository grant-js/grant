import { deleteProject as deleteProjectInStore } from '@/graphql/providers/projects/faker/dataStore';
import { DeleteProjectParams, DeleteProjectResult } from '@/graphql/providers/projects/types';

export async function deleteProject({ id }: DeleteProjectParams): Promise<DeleteProjectResult> {
  const projectData = deleteProjectInStore(id);
  if (!projectData) {
    throw new Error('Project not found');
  }
  return true; // Return boolean indicating successful deletion
}
