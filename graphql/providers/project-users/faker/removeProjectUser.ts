import { MutationRemoveProjectUserArgs, ProjectUser } from '@/graphql/generated/types';
import { deleteProjectUserByProjectAndUser } from '@/graphql/providers/project-users/faker/dataStore';
export async function removeProjectUser({
  input,
}: MutationRemoveProjectUserArgs): Promise<ProjectUser> {
  const deletedProjectUser = deleteProjectUserByProjectAndUser(input.projectId, input.userId);
  if (!deletedProjectUser) {
    throw new Error('Project user relationship not found');
  }
  return deletedProjectUser;
}
