import { MutationCreateProjectArgs, Project } from '@/graphql/generated/types';
import { createProject as createProjectInStore } from '@/graphql/providers/projects/faker/dataStore';
export async function createProject({ input }: MutationCreateProjectArgs): Promise<Project> {
  return createProjectInStore(input);
}
