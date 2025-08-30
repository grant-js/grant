import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryProjectsArgs,
  MutationCreateProjectArgs,
  MutationUpdateProjectArgs,
  MutationDeleteProjectArgs,
  Project,
  ProjectPage,
} from '@/graphql/generated/types';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { projectAuditLogs } from '@/graphql/repositories/projects/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from '../common';

import { IProjectService } from './interface';
import {
  getProjectsParamsSchema,
  createProjectParamsSchema,
  updateProjectParamsSchema,
  deleteProjectParamsSchema,
  projectSchema,
} from './schemas';

export class ProjectService extends AuditService implements IProjectService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: PostgresJsDatabase
  ) {
    super(projectAuditLogs, 'projectId', user, db);
  }

  private async getProject(projectId: string, transaction?: Transaction): Promise<Project> {
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
    params: Omit<QueryProjectsArgs, 'organizationId'> & { requestedFields?: string[] }
  ): Promise<ProjectPage> {
    const validatedParams = validateInput(getProjectsParamsSchema, params, 'getProjects method');
    const result = await this.repositories.projectRepository.getProjects(validatedParams as any);

    const transformedResult = {
      items: result.projects,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(projectSchema, params.requestedFields),
      transformedResult,
      'getProjects method'
    ) as any;

    return {
      projects: validatedResult.items,
      totalCount: validatedResult.totalCount,
      hasNextPage: validatedResult.hasNextPage,
    };
  }

  public async createProject(
    params: MutationCreateProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const validatedParams = validateInput(
      createProjectParamsSchema,
      params,
      'createProject method'
    );

    const dbInstance = transaction || this.db;

    return await TransactionManager.withTransaction(dbInstance, async (tx: Transaction) => {
      const projectInput = {
        input: {
          name: validatedParams.input.name,
          description: validatedParams.input.description,
        },
      };

      const project = await this.repositories.projectRepository.createProject(
        projectInput as any,
        tx
      );

      if (validatedParams.input.organizationId) {
        await this.repositories.organizationProjectRepository.addOrganizationProject(
          validatedParams.input.organizationId,
          project.id,
          tx
        );
      }

      if (validatedParams.input.tagIds && validatedParams.input.tagIds.length > 0) {
        await Promise.all(
          validatedParams.input.tagIds.map((tagId: string) =>
            this.repositories.projectTagRepository.addProjectTag(
              {
                input: {
                  projectId: project.id,
                  tagId,
                },
              },
              tx
            )
          )
        );
      }

      const newValues = {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        organizationId: validatedParams.input.organizationId,
        tagIds: validatedParams.input.tagIds,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };

      const metadata = {
        source: 'create_project_with_relations_mutation',
        organizationId: validatedParams.input.organizationId,
        tagCount: validatedParams.input.tagIds?.length || 0,
      };

      await this.logCreate(project.id, newValues, metadata, tx);

      return validateOutput(
        createDynamicSingleSchema(projectSchema),
        project,
        'createProject method'
      );
    });
  }

  public async updateProject(
    params: MutationUpdateProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const validatedParams = validateInput(
      updateProjectParamsSchema,
      params,
      'updateProject method'
    );

    const oldProject = await this.getProject(validatedParams.id, transaction);
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
      source: 'update_project_mutation',
    };

    await this.logUpdate(updatedProject.id, oldValues, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectSchema),
      updatedProject,
      'updateProject method'
    );
  }

  public async deleteProject(
    params: MutationDeleteProjectArgs & { hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<Project> {
    const validatedParams = validateInput(
      deleteProjectParamsSchema,
      params,
      'deleteProject method'
    );

    const oldProject = await this.getProject(validatedParams.id, transaction);
    const isHardDelete = params.hardDelete === true;

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_mutation',
      };
      await this.logHardDelete(deletedProject.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedProject.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_project_mutation',
      };
      await this.logSoftDelete(deletedProject.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectSchema),
      deletedProject,
      'deleteProject method'
    );
  }
}
