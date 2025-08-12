import { MutationAddProjectGroupArgs, ProjectGroup } from '@/graphql/generated/types';
import { addProjectGroup as addProjectGroupInStore } from '@/graphql/providers/project-groups/faker/dataStore';
export async function addProjectGroup({
  input,
}: MutationAddProjectGroupArgs): Promise<ProjectGroup> {
  return addProjectGroupInStore(input.projectId, input.groupId);
}
