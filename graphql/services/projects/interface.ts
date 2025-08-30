import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface IProjectService {
  getProjects(
    params: Omit<QueryProjectsArgs, 'organizationId'> & { requestedFields?: string[] }
  ): Promise<ProjectPage>;
  createProject(params: MutationCreateProjectArgs, transaction?: Transaction): Promise<Project>;
  updateProject(params: MutationUpdateProjectArgs, transaction?: Transaction): Promise<Project>;
  deleteProject(
    params: MutationDeleteProjectArgs & { hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<Project>;
}
