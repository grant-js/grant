import { ProjectGroup, QueryProjectGroupsArgs } from '@/graphql/generated/types';
import { getProjectGroupsByProjectId } from '@/graphql/providers/project-groups/faker/dataStore';

export async function getProjectGroups({
  projectId,
}: QueryProjectGroupsArgs): Promise<ProjectGroup[]> {
  return getProjectGroupsByProjectId(projectId);
}
