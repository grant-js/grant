import { MutationAddProjectPermissionArgs, ProjectPermission } from '@/graphql/generated/types';
import { addProjectPermission as addProjectPermissionInStore } from '@/graphql/providers/project-permissions/faker/dataStore';
export async function addProjectPermission({
  input,
}: MutationAddProjectPermissionArgs): Promise<ProjectPermission> {
  return addProjectPermissionInStore(input.projectId, input.permissionId);
}
