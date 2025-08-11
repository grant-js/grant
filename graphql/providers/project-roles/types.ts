import {
  MutationAddProjectRoleArgs,
  MutationRemoveProjectRoleArgs,
  ProjectRole,
  QueryProjectRolesArgs,
} from '@/graphql/generated/types';

export interface ProjectRoleDataProvider {
  getProjectRoles(params: QueryProjectRolesArgs): Promise<ProjectRole[]>;
  addProjectRole(params: MutationAddProjectRoleArgs): Promise<ProjectRole>;
  removeProjectRole(params: MutationRemoveProjectRoleArgs): Promise<boolean>;
}
