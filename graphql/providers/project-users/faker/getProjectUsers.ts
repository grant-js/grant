import { ProjectUser, QueryProjectUsersArgs } from '@/graphql/generated/types';
import { getProjectUsersByProjectId } from '@/graphql/providers/project-users/faker/dataStore';

export async function getProjectUsers({
  projectId,
}: QueryProjectUsersArgs): Promise<ProjectUser[]> {
  return getProjectUsersByProjectId(projectId);
}
