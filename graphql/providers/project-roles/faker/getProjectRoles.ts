import { ProjectRole, QueryProjectRolesArgs } from '@/graphql/generated/types';
import { getProjectRolesByProjectId } from '@/graphql/providers/project-roles/faker/dataStore';

export async function getProjectRoles({
  projectId,
}: QueryProjectRolesArgs): Promise<ProjectRole[]> {
  return getProjectRolesByProjectId(projectId);
}
