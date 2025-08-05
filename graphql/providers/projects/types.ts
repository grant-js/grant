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

export type GetProjectsParams = QueryProjectsArgs;
export type GetProjectsResult = ProjectPage;

export type CreateProjectParams = MutationCreateProjectArgs;
export type CreateProjectResult = Project;

export type UpdateProjectParams = MutationUpdateProjectArgs;
export type UpdateProjectResult = Project;

export type DeleteProjectParams = MutationDeleteProjectArgs;
export type DeleteProjectResult = boolean;

export interface ProjectDataProvider {
  getProjects(params: GetProjectsParams): Promise<GetProjectsResult>;
  createProject(params: CreateProjectParams): Promise<CreateProjectResult>;
  updateProject(params: UpdateProjectParams): Promise<UpdateProjectResult>;
  deleteProject(params: DeleteProjectParams): Promise<DeleteProjectResult>;
}
