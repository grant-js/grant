import { ProjectPermission, QueryProjectPermissionsArgs } from '@/graphql/generated/types';
import { getProjectPermissionsByProjectId } from '@/graphql/providers/project-permissions/faker/dataStore';
export async function getProjectPermissions({
  projectId,
}: QueryProjectPermissionsArgs): Promise<ProjectPermission[]> {
  return getProjectPermissionsByProjectId(projectId);
}
