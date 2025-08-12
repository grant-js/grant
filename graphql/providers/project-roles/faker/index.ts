import { addProjectRole } from '@/graphql/providers/project-roles/faker/addProjectRole';
import { getProjectRoles } from '@/graphql/providers/project-roles/faker/getProjectRoles';
import { removeProjectRole } from '@/graphql/providers/project-roles/faker/removeProjectRole';
import { ProjectRoleDataProvider } from '@/graphql/providers/project-roles/types';
export const projectRoleFakerProvider: ProjectRoleDataProvider = {
  getProjectRoles,
  addProjectRole,
  removeProjectRole,
};
