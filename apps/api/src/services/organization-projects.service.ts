import {
  AddOrganizationProjectInput,
  OrganizationProject,
  RemoveOrganizationProjectInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationProjectInputSchema,
  organizationProjectSchema,
  queryOrganizationProjectArgsSchema,
  queryOrganizationProjectsArgsSchema,
  removeOrganizationProjectInputSchema,
} from './organization-projects.schemas';

import type {
  IAuditLogger,
  IOrganizationProjectRepository,
  IOrganizationProjectService,
  IOrganizationRepository,
  IProjectRepository,
} from '@grantjs/core';

export class OrganizationProjectService implements IOrganizationProjectService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly organizationProjectRepository: IOrganizationProjectRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization');
    }
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async organizationHasProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.projectExists(projectId, transaction);
    const existingOrganizationProjects =
      await this.organizationProjectRepository.getOrganizationProjects(
        { organizationId },
        transaction
      );
    return existingOrganizationProjects.some((op) => op.projectId === projectId);
  }

  public async getOrganizationProjects(
    params: { organizationId: string },
    transaction?: Transaction
  ): Promise<OrganizationProject[]> {
    const validationContext = 'OrganizationProjectService.getOrganizationProjects';
    const validatedParams = validateInput(
      queryOrganizationProjectsArgsSchema,
      params,
      validationContext
    );

    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId, transaction);

    const result = await this.organizationProjectRepository.getOrganizationProjects(
      { organizationId },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema).array(),
      result,
      validationContext
    );
  }

  public async getOrganizationProject(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const validationContext = 'OrganizationProjectService.getOrganizationProject';
    const validatedParams = validateInput(
      queryOrganizationProjectArgsSchema,
      params,
      validationContext
    );
    const { projectId } = validatedParams;

    await this.projectExists(projectId, transaction);

    const result = await this.organizationProjectRepository.getOrganizationProject(
      { projectId },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      result,
      validationContext
    );
  }

  public async addOrganizationProject(
    params: AddOrganizationProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const context = 'OrganizationProjectService.addOrganizationProject';
    const validatedParams = validateInput(addOrganizationProjectInputSchema, params, context);

    const { organizationId, projectId } = validatedParams;
    const hasProject = await this.organizationHasProject(organizationId, projectId, transaction);

    if (hasProject) {
      throw new ConflictError(
        'Organization already has this project',
        'OrganizationProject',
        'projectId'
      );
    }

    const organizationProject = await this.organizationProjectRepository.addOrganizationProject(
      { organizationId, projectId },
      transaction
    );

    const newValues = {
      id: organizationProject.id,
      organizationId: organizationProject.organizationId,
      projectId: organizationProject.projectId,
      createdAt: organizationProject.createdAt,
      updatedAt: organizationProject.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(organizationProject.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      organizationProject,
      context
    );
  }

  public async removeOrganizationProject(
    params: RemoveOrganizationProjectInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const context = 'OrganizationProjectService.removeOrganizationProject';
    const validatedParams = validateInput(removeOrganizationProjectInputSchema, params, context);

    const { organizationId, projectId, hardDelete } = validatedParams;

    const hasProject = await this.organizationHasProject(organizationId, projectId);

    if (!hasProject) {
      throw new NotFoundError('Project');
    }

    const isHardDelete = hardDelete === true;

    const organizationProject = isHardDelete
      ? await this.organizationProjectRepository.hardDeleteOrganizationProject(
          { organizationId, projectId },
          transaction
        )
      : await this.organizationProjectRepository.softDeleteOrganizationProject(
          { organizationId, projectId },
          transaction
        );

    const oldValues = {
      id: organizationProject.id,
      organizationId: organizationProject.organizationId,
      projectId: organizationProject.projectId,
      createdAt: organizationProject.createdAt,
      updatedAt: organizationProject.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: organizationProject.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(organizationProject.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        organizationProject.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(organizationProjectSchema),
      organizationProject,
      context
    );
  }
}
