import { MutationRemoveProjectUserArgs } from '@/graphql/generated/types';
import { deleteProjectUserByProjectAndUser } from '@/graphql/providers/project-users/faker/dataStore';

export async function removeProjectUser({
  input,
}: MutationRemoveProjectUserArgs): Promise<boolean> {
  const deletedProjectUser = deleteProjectUserByProjectAndUser(input.projectId, input.userId);
  return deletedProjectUser !== null;
}
