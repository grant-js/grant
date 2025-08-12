import { MutationAddProjectTagArgs, ProjectTag } from '@/graphql/generated/types';
import { addProjectTag as addProjectTagToStore } from '@/graphql/providers/project-tags/faker/dataStore';
export async function addProjectTag({ input }: MutationAddProjectTagArgs): Promise<ProjectTag> {
  return addProjectTagToStore(input.projectId, input.tagId);
}
