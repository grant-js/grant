import { MutationRemoveProjectPermissionArgs, ProjectPermission } from '@/graphql/generated/types';
import { deleteProjectPermissionByProjectAndPermission } from '@/graphql/providers/project-permissions/faker/dataStore';

export async function removeProjectPermission({
  input,
}: MutationRemoveProjectPermissionArgs): Promise<ProjectPermission> {
  const deletedProjectPermission = deleteProjectPermissionByProjectAndPermission(
    input.projectId,
    input.permissionId
  );

  if (!deletedProjectPermission) {
    throw new Error('Project permission relationship not found');
  }

  return deletedProjectPermission;
}
