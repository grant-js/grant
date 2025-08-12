import {
  MutationAddProjectTagArgs,
  MutationRemoveProjectTagArgs,
  ProjectTag,
  QueryProjectTagsArgs,
} from '@/graphql/generated/types';
export interface ProjectTagDataProvider {
  getProjectTags(params: QueryProjectTagsArgs): Promise<ProjectTag[]>;
  addProjectTag(params: MutationAddProjectTagArgs): Promise<ProjectTag>;
  removeProjectTag(params: MutationRemoveProjectTagArgs): Promise<ProjectTag>;
}
