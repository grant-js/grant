import { addProjectUser } from '@/graphql/providers/project-users/faker/addProjectUser';
import { getProjectUsers } from '@/graphql/providers/project-users/faker/getProjectUsers';
import { removeProjectUser } from '@/graphql/providers/project-users/faker/removeProjectUser';
import { ProjectUserDataProvider } from '@/graphql/providers/project-users/types';
export const projectUserFakerProvider: ProjectUserDataProvider = {
  getProjectUsers,
  addProjectUser,
  removeProjectUser,
};
