import { createProject } from '@/graphql/providers/projects/faker/createProject';
import { deleteProject } from '@/graphql/providers/projects/faker/deleteProject';
import { getProjects } from '@/graphql/providers/projects/faker/getProjects';
import { updateProject } from '@/graphql/providers/projects/faker/updateProject';
import { ProjectDataProvider } from '@/graphql/providers/projects/types';

export const projectFakerProvider: ProjectDataProvider = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
};
