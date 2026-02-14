import {
  CreateProjectInput,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectPage,
  QueryProjectsArgs,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  createProjectParamsSchema,
  deleteProjectParamsSchema,
  getProjectsParamsSchema,
  projectSchema,
  updateProjectParamsSchema,
} from './projects.schemas';

import type { IAuditLogger, IProjectRepository, IProjectService } from '@grantjs/core';

export class ProjectService implements IProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async getProject(projectId: string): Promise<Project> {
    const project = await this.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (project.projects.length === 0) {
      throw new NotFoundError('Project');
    }

    return project.projects[0];
  }

  public async getProjects(
    params: Omit<QueryProjectsArgs, 'scope' | 'tagIds'> & SelectedFields<Project>
  ): Promise<ProjectPage> {
    const validationContext = 'ProjectService.getProjects';
    validateInput(getProjectsParamsSchema, params, validationContext);
    const result = await this.projectRepository.getProjects(params);

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
    params: Omit<CreateProjectInput, 'scope' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<Project> {
    const context = 'ProjectService.createProject';
    const validatedParams = validateInput(createProjectParamsSchema, params, context);
    const { name, description } = validatedParams;

    const project = await this.projectRepository.createProject({ name, description }, transaction);

    const newValues = {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(project.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectSchema), project, context);
  }

  public async updateProject(
    params: MutationUpdateProjectArgs,
    transaction?: Transaction
  ): Promise<Project> {
    const context = 'ProjectService.updateProject';
    const validatedParams = validateInput(updateProjectParamsSchema, params, context);

    const oldProject = await this.getProject(validatedParams.id);
    const updatedProject = await this.projectRepository.updateProject(validatedParams, transaction);

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

    await this.audit.logUpdate(updatedProject.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectSchema), updatedProject, context);
  }

  public async deleteProject(
    params: Omit<MutationDeleteProjectArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Project> {
    const context = 'ProjectService.deleteProject';
    const validatedParams = validateInput(deleteProjectParamsSchema, params, context);
    const { id, hardDelete } = validatedParams;

    const oldProject = await this.getProject(id);
    const isHardDelete = hardDelete === true;

    const deletedProject = isHardDelete
      ? await this.projectRepository.hardDeleteProject(validatedParams, transaction)
      : await this.projectRepository.softDeleteProject(validatedParams, transaction);

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
      await this.audit.logHardDelete(deletedProject.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        deletedProject.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(projectSchema), deletedProject, context);
  }
}
