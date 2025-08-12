import {
  MutationAddProjectUserArgs,
  MutationRemoveProjectUserArgs,
  ProjectUser,
  QueryProjectUsersArgs,
} from '@/graphql/generated/types';
export interface ProjectUserDataProvider {
  getProjectUsers(params: QueryProjectUsersArgs): Promise<ProjectUser[]>;
  addProjectUser(params: MutationAddProjectUserArgs): Promise<ProjectUser>;
  removeProjectUser(params: MutationRemoveProjectUserArgs): Promise<ProjectUser>;
}
