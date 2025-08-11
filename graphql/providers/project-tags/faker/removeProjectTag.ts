import { MutationRemoveProjectTagArgs } from '@/graphql/generated/types';
import { deleteProjectTagByProjectAndTag } from '@/graphql/providers/project-tags/faker/dataStore';

export async function removeProjectTag({ input }: MutationRemoveProjectTagArgs): Promise<boolean> {
  const deletedProjectTag = deleteProjectTagByProjectAndTag(input.projectId, input.tagId);
  if (!deletedProjectTag) {
    throw new Error('Project tag not found');
  }
  return deletedProjectTag !== null;
}
