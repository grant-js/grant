import { MutationRemoveProjectPermissionArgs } from '@/graphql/generated/types';
import { deleteProjectPermissionByProjectAndPermission } from '@/graphql/providers/project-permissions/faker/dataStore';

export async function removeProjectPermission({
  input,
}: MutationRemoveProjectPermissionArgs): Promise<boolean> {
  const deletedProjectPermission = deleteProjectPermissionByProjectAndPermission(
    input.projectId,
    input.permissionId
  );
  if (!deletedProjectPermission) {
    throw new Error('Project permission not found');
  }
  return deletedProjectPermission !== null;
}
