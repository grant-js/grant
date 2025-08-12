import { MutationAddProjectUserArgs, ProjectUser } from '@/graphql/generated/types';
import { addProjectUser as addProjectUserInStore } from '@/graphql/providers/project-users/faker/dataStore';
export async function addProjectUser({ input }: MutationAddProjectUserArgs): Promise<ProjectUser> {
  const projectUserData = addProjectUserInStore(input.projectId, input.userId);
  return projectUserData;
}
