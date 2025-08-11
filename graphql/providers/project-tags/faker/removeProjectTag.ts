import { MutationRemoveProjectTagArgs, ProjectTag } from '@/graphql/generated/types';
import { deleteProjectTagByProjectAndTag } from '@/graphql/providers/project-tags/faker/dataStore';

export async function removeProjectTag({
  input,
}: MutationRemoveProjectTagArgs): Promise<ProjectTag> {
  const deletedProjectTag = deleteProjectTagByProjectAndTag(input.projectId, input.tagId);

  if (!deletedProjectTag) {
    throw new Error('Project tag relationship not found');
  }

  return deletedProjectTag;
}
