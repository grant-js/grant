import { MutationRemoveProjectRoleArgs, ProjectRole } from '@/graphql/generated/types';
import { deleteProjectRoleByProjectAndRole } from '@/graphql/providers/project-roles/faker/dataStore';

export async function removeProjectRole({
  input,
}: MutationRemoveProjectRoleArgs): Promise<ProjectRole> {
  const deletedProjectRole = deleteProjectRoleByProjectAndRole(input.projectId, input.roleId);

  if (!deletedProjectRole) {
    throw new Error('Project role relationship not found');
  }

  return deletedProjectRole;
}
