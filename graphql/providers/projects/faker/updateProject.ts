import { Project } from '@/graphql/generated/types';
import { updateProject as updateProjectInStore } from '@/graphql/providers/projects/faker/dataStore';
import { UpdateProjectParams, UpdateProjectResult } from '@/graphql/providers/projects/types';

export async function updateProject({
  id,
  input,
}: UpdateProjectParams): Promise<UpdateProjectResult> {
  const projectData = updateProjectInStore(id, input);
  if (!projectData) {
    throw new Error('Project not found');
  }
  return projectData as Project; // Convert ProjectData to Project for GraphQL
}
