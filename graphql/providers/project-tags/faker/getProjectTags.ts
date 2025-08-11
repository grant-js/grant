import { ProjectTag, QueryProjectTagsArgs } from '@/graphql/generated/types';
import { getProjectTagsByProjectId } from '@/graphql/providers/project-tags/faker/dataStore';

export async function getProjectTags({ projectId }: QueryProjectTagsArgs): Promise<ProjectTag[]> {
  return getProjectTagsByProjectId(projectId);
}
