import { Project } from '@/graphql/generated/types';
import { createProject as createProjectInStore } from '@/graphql/providers/projects/faker/dataStore';
import { CreateProjectParams, CreateProjectResult } from '@/graphql/providers/projects/types';

export async function createProject({ input }: CreateProjectParams): Promise<CreateProjectResult> {
  const projectData = createProjectInStore(input);
  return projectData as Project; // Convert ProjectData to Project for GraphQL
}
