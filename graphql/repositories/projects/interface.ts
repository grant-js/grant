import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface IProjectRepository {
  getProjects(
    params: Omit<QueryProjectsArgs, 'organizationId'> & { requestedFields?: string[] }
  ): Promise<ProjectPage>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(params: MutationCreateProjectArgs, transaction?: Transaction): Promise<Project>;
  updateProject(params: MutationUpdateProjectArgs, transaction?: Transaction): Promise<Project>;
  softDeleteProject(params: MutationDeleteProjectArgs, transaction?: Transaction): Promise<Project>;
  hardDeleteProject(params: MutationDeleteProjectArgs, transaction?: Transaction): Promise<Project>;
}
