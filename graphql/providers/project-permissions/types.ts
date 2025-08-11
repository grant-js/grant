import {
  MutationAddProjectPermissionArgs,
  MutationRemoveProjectPermissionArgs,
  ProjectPermission,
  QueryProjectPermissionsArgs,
} from '@/graphql/generated/types';

export interface ProjectPermissionDataProvider {
  getProjectPermissions(params: QueryProjectPermissionsArgs): Promise<ProjectPermission[]>;
  addProjectPermission(params: MutationAddProjectPermissionArgs): Promise<ProjectPermission>;
  removeProjectPermission(params: MutationRemoveProjectPermissionArgs): Promise<ProjectPermission>;
}
