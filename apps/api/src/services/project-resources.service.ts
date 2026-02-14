import {
  AddProjectResourceInput,
  ProjectResource,
  QueryProjectResourcesInput,
  RemoveProjectResourceInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectResourceInputSchema,
  getProjectResourcesParamsSchema,
  projectResourceSchema,
  removeProjectResourceInputSchema,
} from './project-resources.schemas';

import type {
  IAuditLogger,
  IProjectRepository,
  IProjectResourceRepository,
  IProjectResourceService,
  IResourceRepository,
} from '@grantjs/core';

export class ProjectResourceService implements IProjectResourceService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly resourceRepository: IResourceRepository,
    private readonly projectResourceRepository: IProjectResourceRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async resourceExists(resourceId: string, transaction?: Transaction): Promise<void> {
    const resources = await this.resourceRepository.getResources(
      { ids: [resourceId], limit: 1 },
      transaction
    );

    if (resources.resources.length === 0) {
      throw new NotFoundError('Resource');
    }
  }

  private async projectHasResource(
    projectId: string,
    resourceId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.resourceExists(resourceId, transaction);
    const existingProjectResources = await this.projectResourceRepository.getProjectResources(
      { projectId },
      transaction
    );

    return existingProjectResources.some((pr) => pr.resourceId === resourceId);
  }

  public async getProjectResources(
    params: QueryProjectResourcesInput,
    transaction?: Transaction
  ): Promise<ProjectResource[]> {
    const context = 'ProjectResourceService.getProjectResources';
    const validatedParams = validateInput(getProjectResourcesParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);

    const result = await this.projectResourceRepository.getProjectResources(
      validatedParams,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(projectResourceSchema).array(),
      result,
      context
    );
  }

  public async getProjectResourcesByResourceId(
    resourceId: string,
    transaction?: Transaction
  ): Promise<ProjectResource[]> {
    const result = await this.projectResourceRepository.getProjectResources(
      { resourceId },
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(projectResourceSchema).array(),
      result,
      'ProjectResourceService.getProjectResourcesByResourceId'
    );
  }

  public async addProjectResource(
    params: AddProjectResourceInput,
    transaction?: Transaction
  ): Promise<ProjectResource> {
    const context = 'ProjectResourceService.addProjectResource';
    const validatedParams = validateInput(addProjectResourceInputSchema, params, context);
    const { projectId, resourceId } = validatedParams;

    const hasResource = await this.projectHasResource(projectId, resourceId, transaction);

    if (hasResource) {
      throw new ConflictError('Project already has this resource', 'ProjectResource', 'resourceId');
    }

    const projectResource = await this.projectResourceRepository.addProjectResource(
      { projectId, resourceId },
      transaction
    );

    const newValues = {
      id: projectResource.id,
      projectId: projectResource.projectId,
      resourceId: projectResource.resourceId,
      createdAt: projectResource.createdAt,
      updatedAt: projectResource.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(projectResource.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(projectResourceSchema),
      projectResource,
      context
    );
  }

  public async removeProjectResource(
    params: RemoveProjectResourceInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectResource> {
    const context = 'ProjectResourceService.removeProjectResource';
    const validatedParams = validateInput(removeProjectResourceInputSchema, params, context);

    const { projectId, resourceId, hardDelete } = validatedParams;

    const hasResource = await this.projectHasResource(projectId, resourceId, transaction);

    if (!hasResource) {
      throw new NotFoundError('Resource');
    }

    const isHardDelete = hardDelete === true;

    const projectResource = isHardDelete
      ? await this.projectResourceRepository.hardDeleteProjectResource(
          { projectId, resourceId },
          transaction
        )
      : await this.projectResourceRepository.softDeleteProjectResource(
          { projectId, resourceId },
          transaction
        );

    const oldValues = {
      id: projectResource.id,
      projectId: projectResource.projectId,
      resourceId: projectResource.resourceId,
      createdAt: projectResource.createdAt,
      updatedAt: projectResource.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectResource.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(projectResource.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        projectResource.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(projectResourceSchema),
      projectResource,
      context
    );
  }
}
