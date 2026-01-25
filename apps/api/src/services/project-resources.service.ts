import { GrantAuth } from '@grantjs/core';
import { DbSchema, projectResourceAuditLogs } from '@grantjs/database';
import {
  AddProjectResourceInput,
  ProjectResource,
  QueryProjectResourcesInput,
  RemoveProjectResourceInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  addProjectResourceInputSchema,
  getProjectResourcesParamsSchema,
  projectResourceSchema,
  removeProjectResourceInputSchema,
} from './project-resources.schemas';

export class ProjectResourceService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(projectResourceAuditLogs, 'projectResourceId', user, db);
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project not found', 'errors:notFound.project');
    }
  }

  private async resourceExists(resourceId: string, transaction?: Transaction): Promise<void> {
    const resources = await this.repositories.resourceRepository.getResources(
      { ids: [resourceId], limit: 1 },
      transaction
    );

    if (resources.resources.length === 0) {
      throw new NotFoundError('Resource not found', 'errors:notFound.resource');
    }
  }

  private async projectHasResource(
    projectId: string,
    resourceId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.resourceExists(resourceId, transaction);
    const existingProjectResources =
      await this.repositories.projectResourceRepository.getProjectResources(
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

    const result = await this.repositories.projectResourceRepository.getProjectResources(
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
    const result = await this.repositories.projectResourceRepository.getProjectResources(
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
      throw new ConflictError(
        'Project already has this resource',
        'errors:conflict.duplicateEntry',
        { resource: 'ProjectResource', field: 'resourceId' }
      );
    }

    const projectResource = await this.repositories.projectResourceRepository.addProjectResource(
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

    await this.logCreate(projectResource.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Project does not have this resource', 'errors:notFound.resource');
    }

    const isHardDelete = hardDelete === true;

    const projectResource = isHardDelete
      ? await this.repositories.projectResourceRepository.hardDeleteProjectResource(
          { projectId, resourceId },
          transaction
        )
      : await this.repositories.projectResourceRepository.softDeleteProjectResource(
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
      await this.logHardDelete(projectResource.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(projectResource.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(projectResourceSchema),
      projectResource,
      context
    );
  }
}
