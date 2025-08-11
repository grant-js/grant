import { MutationRemoveProjectRoleArgs } from '@/graphql/generated/types';
import { deleteProjectRoleByProjectAndRole } from '@/graphql/providers/project-roles/faker/dataStore';

export async function removeProjectRole({
  input,
}: MutationRemoveProjectRoleArgs): Promise<boolean> {
  const deletedProjectRole = deleteProjectRoleByProjectAndRole(input.projectId, input.roleId);
  if (!deletedProjectRole) {
    throw new Error('Project role not found');
  }
  return deletedProjectRole !== null;
}
