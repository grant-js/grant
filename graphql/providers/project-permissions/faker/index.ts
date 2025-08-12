import { addProjectPermission } from '@/graphql/providers/project-permissions/faker/addProjectPermission';
import { getProjectPermissions } from '@/graphql/providers/project-permissions/faker/getProjectPermissions';
import { removeProjectPermission } from '@/graphql/providers/project-permissions/faker/removeProjectPermission';
import { ProjectPermissionDataProvider } from '@/graphql/providers/project-permissions/types';
export const projectPermissionFakerProvider: ProjectPermissionDataProvider = {
  getProjectPermissions,
  addProjectPermission,
  removeProjectPermission,
};
