import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';

// Type for project data without the resolved fields
export type ProjectData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface ProjectDataProvider {
  getProjects(params: QueryProjectsArgs): Promise<ProjectPage>;
  createProject(params: MutationCreateProjectArgs): Promise<Project>;
  updateProject(params: MutationUpdateProjectArgs): Promise<Project>;
  deleteProject(params: MutationDeleteProjectArgs): Promise<boolean>;
}
