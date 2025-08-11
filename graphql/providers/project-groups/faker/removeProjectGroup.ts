import { MutationRemoveProjectGroupArgs, ProjectGroup } from '@/graphql/generated/types';
import { deleteProjectGroupByProjectAndGroup } from '@/graphql/providers/project-groups/faker/dataStore';

export async function removeProjectGroup({
  input,
}: MutationRemoveProjectGroupArgs): Promise<ProjectGroup> {
  const deletedProjectGroup = deleteProjectGroupByProjectAndGroup(input.projectId, input.groupId);

  if (!deletedProjectGroup) {
    throw new Error('Project group relationship not found');
  }

  return deletedProjectGroup;
}
