import { MutationRemoveProjectGroupArgs } from '@/graphql/generated/types';
import { deleteProjectGroupByProjectAndGroup } from '@/graphql/providers/project-groups/faker/dataStore';

export async function removeProjectGroup({
  input,
}: MutationRemoveProjectGroupArgs): Promise<boolean> {
  const deletedProjectGroup = deleteProjectGroupByProjectAndGroup(input.projectId, input.groupId);
  if (!deletedProjectGroup) {
    throw new Error('Project group not found');
  }
  return deletedProjectGroup !== null;
}
