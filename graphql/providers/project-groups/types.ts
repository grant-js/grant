import {
  MutationAddProjectGroupArgs,
  MutationRemoveProjectGroupArgs,
  ProjectGroup,
  QueryProjectGroupsArgs,
} from '@/graphql/generated/types';

export interface ProjectGroupDataProvider {
  getProjectGroups(params: QueryProjectGroupsArgs): Promise<ProjectGroup[]>;
  addProjectGroup(params: MutationAddProjectGroupArgs): Promise<ProjectGroup>;
  removeProjectGroup(params: MutationRemoveProjectGroupArgs): Promise<ProjectGroup>;
}
