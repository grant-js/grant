import { addProjectGroup } from '@/graphql/providers/project-groups/faker/addProjectGroup';
import { getProjectGroups } from '@/graphql/providers/project-groups/faker/getProjectGroups';
import { removeProjectGroup } from '@/graphql/providers/project-groups/faker/removeProjectGroup';
import { ProjectGroupDataProvider } from '@/graphql/providers/project-groups/types';
export const projectGroupFakerProvider: ProjectGroupDataProvider = {
  getProjectGroups,
  addProjectGroup,
  removeProjectGroup,
};
