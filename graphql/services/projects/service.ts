import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryProjectsArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
  CreateProjectInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { projectAuditLogs, ProjectModel } from '@/graphql/repositories/projects/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  DeleteParams,
  SelectedFields,
} from '../common';

import {
  getProjectsParamsSchema,
  createProjectParamsSchema,
  updateProjectParamsSchema,
  deleteProjectParamsSchema,
  projectSchema,
} from './schemas';

export class ProjectService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: PostgresJsDatabase
  ) {
    super(projectAuditLogs, 'projectId', user, db);
  }

  private async getProject(projectId: string): Promise<Project> {
    const project = await this.repositories.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (project.projects.length === 0) {
      throw new Error('Project not found');
    }

    return project.projects[0];
  }

  public async getProjects(
    params: Omit<QueryProjectsArgs, 'organizationId' | 'tagIds'> & SelectedFields<ProjectModel>
  ): Promise<ProjectPage> {
    const validationContext = 'ProjectService.getProjects';
    validateInput(getProjectsParamsSchema, params, validationContext);
    const result = await this.repositories.projectRepository.getProjects(params);

    const transformedResult = {
      items: result.projects,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(projectSchema),
      transformedResult,
      validationContext
    );

    return result;
  }

  public async createProject(
    params: Omit<CreateProjectInput, 'organizationId' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<Project> {
    const validationContext = 'ProjectService.createProject';
    const validatedParams = validateInput(createProjectParamsSchema, params, validationContext);
    const { name, description } = validatedParams;

    const project = await this.repositories.projectRepository.createProject(
      { name, description },
      transaction
    );

    const newValues = {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    const metadata = {
      source: 'create_project_with_relations_mutation',
    };

    await this.logCreate(project.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectSchema), project, validationContext);
  }

  public async updateProject(
    params: MutationUpdateProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const context = 'ProjectService.updateProject';
    const validatedParams = validateInput(updateProjectParamsSchema, params, context);

    const oldProject = await this.getProject(validatedParams.id);
    const updatedProject = await this.repositories.projectRepository.updateProject(
      validatedParams,
      transaction
    );

    const oldValues = {
      id: oldProject.id,
      name: oldProject.name,
      slug: oldProject.slug,
      description: oldProject.description,
      createdAt: oldProject.createdAt,
      updatedAt: oldProject.updatedAt,
    };

    const newValues = {
      id: updatedProject.id,
      name: updatedProject.name,
      slug: updatedProject.slug,
      description: updatedProject.description,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(updatedProject.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectSchema), updatedProject, context);
  }

  public async deleteProject(
    params: MutationDeleteProjectArgs & DeleteParams,
    transaction?: Transaction
  ): Promise<Project> {
    const context = 'ProjectService.deleteProject';
    const validatedParams = validateInput(deleteProjectParamsSchema, params, context);
    const { id, hardDelete } = validatedParams;

    const oldProject = await this.getProject(id);
    const isHardDelete = hardDelete === true;

    const deletedProject = isHardDelete
      ? await this.repositories.projectRepository.hardDeleteProject(validatedParams, transaction)
      : await this.repositories.projectRepository.softDeleteProject(validatedParams, transaction);

    const oldValues = {
      id: oldProject.id,
      name: oldProject.name,
      slug: oldProject.slug,
      description: oldProject.description,
      createdAt: oldProject.createdAt,
      updatedAt: oldProject.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: deletedProject.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedProject.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(deletedProject.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectSchema), deletedProject, context);
  }
}
