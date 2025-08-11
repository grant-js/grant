import { MutationAddProjectRoleArgs, ProjectRole } from '@/graphql/generated/types';
import { addProjectRole as addProjectRoleInStore } from '@/graphql/providers/project-roles/faker/dataStore';

export async function addProjectRole({ input }: MutationAddProjectRoleArgs): Promise<ProjectRole> {
  return addProjectRoleInStore(input.projectId, input.roleId);
}
