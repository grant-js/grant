import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';

export interface ProjectDataProvider {
  getProjects(params: QueryProjectsArgs): Promise<ProjectPage>;
  createProject(params: MutationCreateProjectArgs): Promise<Project>;
  updateProject(params: MutationUpdateProjectArgs): Promise<Project>;
  deleteProject(params: MutationDeleteProjectArgs): Promise<Project>;
}
